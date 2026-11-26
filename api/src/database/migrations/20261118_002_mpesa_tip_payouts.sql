-- Migration: Pay out M-Pesa tips to staff (KCB IPN phase 4)
-- Date: 2026-11-18
-- Description:
--   Tips kept from M-Pesa overpayments accrue on 2200 Staff Tips Payable per
--   staff member (mpesa_allocations.tip_recipient_id). This adds payouts:
--     pay_mpesa_tips()  Dr 2200 Staff Tips Payable / Cr cash or bank account
--   A staff member can never be paid more than they are owed, and a tip that
--   has already been paid out can no longer be reversed.

-- ── 1. Payouts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mpesa_tip_payouts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id      uuid NOT NULL REFERENCES public.profiles(id),
    amount            numeric(12, 2) NOT NULL CHECK (amount > 0),
    paid_from_account uuid NOT NULL REFERENCES public.chart_of_accounts(id),
    journal_entry_id  uuid REFERENCES public.journal_entries(id),
    notes             text,
    paid_by           uuid NOT NULL REFERENCES public.profiles(id),
    paid_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mpesa_tip_payouts_recipient
    ON public.mpesa_tip_payouts (recipient_id, paid_at DESC);

-- ── 2. What a staff member is owed (accrued tips − payouts) ─────────────────
CREATE OR REPLACE FUNCTION public.mpesa_tips_outstanding(p_recipient_id uuid)
RETURNS numeric LANGUAGE sql STABLE AS $function$
    SELECT COALESCE((
        SELECT SUM(amount) FROM mpesa_allocations
        WHERE allocation_type = 'tip'
          AND tip_recipient_id = p_recipient_id
          AND reversed_at IS NULL
    ), 0) - COALESCE((
        SELECT SUM(amount) FROM mpesa_tip_payouts
        WHERE recipient_id = p_recipient_id
    ), 0);
$function$;

-- ── 3. Pay out ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.pay_mpesa_tips(
    p_recipient_id uuid,
    p_amount numeric,
    p_account_id uuid,
    p_user_id uuid,
    p_notes text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql AS $function$
DECLARE
    v_outstanding numeric;
    v_tips        uuid;
    v_account     chart_of_accounts%ROWTYPE;
    v_name        text;
    v_payout_id   uuid;
    v_journal_id  uuid;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN
        RAISE EXCEPTION 'MPESA_INVALID_PAYOUT' USING DETAIL = 'amount must be positive with at most 2 decimals';
    END IF;

    -- One payout at a time per staff member, so two clicks can't overpay.
    PERFORM pg_advisory_xact_lock(hashtext('mpesa_tip_payout:' || p_recipient_id::text));

    SELECT name INTO v_name FROM profiles WHERE id = p_recipient_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'MPESA_TIP_RECIPIENT_NOT_FOUND' USING DETAIL = p_recipient_id::text;
    END IF;

    SELECT * INTO v_account FROM chart_of_accounts WHERE id = p_account_id;
    IF NOT FOUND
       OR v_account.account_class <> 'bank'
       OR NOT COALESCE(v_account.active, true)
       OR EXISTS (SELECT 1 FROM chart_of_accounts ch WHERE ch.parent_id = v_account.id) THEN
        RAISE EXCEPTION 'MPESA_INVALID_PAYOUT' USING DETAIL = 'pay from an active cash or bank account';
    END IF;

    v_outstanding := mpesa_tips_outstanding(p_recipient_id);
    IF p_amount > v_outstanding THEN
        RAISE EXCEPTION 'MPESA_PAYOUT_EXCEEDS_TIPS'
            USING DETAIL = format('%s is owed %s', v_name, v_outstanding);
    END IF;

    SELECT id INTO v_tips FROM chart_of_accounts WHERE code = '2200';
    IF v_tips IS NULL THEN
        RAISE EXCEPTION 'Missing GL account 2200 (Staff Tips Payable)';
    END IF;

    INSERT INTO mpesa_tip_payouts (recipient_id, amount, paid_from_account, notes, paid_by)
    VALUES (p_recipient_id, p_amount, p_account_id, NULLIF(btrim(p_notes), ''), p_user_id)
    RETURNING id INTO v_payout_id;

    INSERT INTO journal_entries (entry_date, source_type, source_id, description)
    VALUES (CURRENT_DATE, 'mpesa_tip_payout', v_payout_id,
            'Tips paid out to ' || v_name || COALESCE(' - ' || NULLIF(btrim(p_notes), ''), ''))
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_journal_id, v_tips,       p_amount, 0),
           (v_journal_id, p_account_id, 0,        p_amount);

    UPDATE mpesa_tip_payouts SET journal_entry_id = v_journal_id WHERE id = v_payout_id;

    RETURN json_build_object(
        'payout_id', v_payout_id,
        'recipient_id', p_recipient_id,
        'recipient_name', v_name,
        'amount', p_amount,
        'paid_from', v_account.name,
        'outstanding', v_outstanding - p_amount
    );
END;
$function$;

-- ── 4. Reversal: refuse to reverse a tip that was already paid out ──────────
-- Same as 20261117_001 except the tip guard marked below.
CREATE OR REPLACE FUNCTION public.reverse_mpesa_allocation(
    p_allocation_id uuid,
    p_user_id uuid,
    p_reason text
) RETURNS json LANGUAGE plpgsql AS $function$
DECLARE
    v_alloc      mpesa_allocations%ROWTYPE;
    v_txn        mpesa_transactions%ROWTYPE;
    v_bill       bills%ROWTYPE;
    v_totals     RECORD;
    v_clearing   uuid;
    v_other      uuid;
    v_journal_id uuid;
    v_new_alloc  numeric;
    v_new_status text;
BEGIN
    IF NULLIF(btrim(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'MPESA_REVERSAL_REASON_REQUIRED';
    END IF;

    SELECT * INTO v_alloc FROM mpesa_allocations WHERE id = p_allocation_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'MPESA_ALLOCATION_NOT_FOUND';
    END IF;
    IF v_alloc.reversed_at IS NOT NULL THEN
        RAISE EXCEPTION 'MPESA_ALLOCATION_ALREADY_REVERSED';
    END IF;

    -- NEW: a tip already paid out to staff can't be taken back here.
    IF v_alloc.allocation_type = 'tip' AND v_alloc.tip_recipient_id IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(hashtext('mpesa_tip_payout:' || v_alloc.tip_recipient_id::text));
        IF mpesa_tips_outstanding(v_alloc.tip_recipient_id) < v_alloc.amount THEN
            RAISE EXCEPTION 'MPESA_TIP_ALREADY_PAID_OUT'
                USING DETAIL = format('only %s of this staff member''s tips is still unpaid',
                                      mpesa_tips_outstanding(v_alloc.tip_recipient_id));
        END IF;
    END IF;

    SELECT * INTO v_txn FROM mpesa_transactions WHERE id = v_alloc.mpesa_transaction_id FOR UPDATE;

    SELECT id INTO v_clearing FROM chart_of_accounts WHERE code = '2300';
    SELECT id INTO v_other FROM chart_of_accounts
    WHERE code = CASE WHEN v_alloc.allocation_type = 'bill' THEN '1201' ELSE '2200' END;

    IF v_alloc.allocation_type = 'bill' THEN
        SELECT * INTO v_bill FROM bills WHERE id = v_alloc.bill_id FOR UPDATE;
        IF v_bill.status = 'void' THEN
            RAISE EXCEPTION 'MPESA_BILL_NOT_PAYABLE' USING DETAIL = 'bill is void';
        END IF;

        UPDATE payments
        SET status = 'voided', is_paid = false, updated_by = p_user_id, updated_at = now()
        WHERE id = v_alloc.payment_id;
    END IF;

    INSERT INTO journal_entries (entry_date, source_type, source_id, reference, description, reversed_entry_id)
    VALUES (
        CURRENT_DATE,
        CASE WHEN v_alloc.allocation_type = 'bill' THEN 'payment_reversal' ELSE 'mpesa_tip_reversal' END,
        COALESCE(v_alloc.payment_id, v_alloc.id),
        v_txn.transaction_id,
        'Reversal of M-Pesa ' || v_txn.transaction_id || ' allocation: ' || p_reason,
        v_alloc.journal_entry_id
    )
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_journal_id, v_other,    v_alloc.amount, 0),
           (v_journal_id, v_clearing, 0,              v_alloc.amount);

    UPDATE mpesa_allocations
    SET reversed_at = now(), reversed_by = p_user_id,
        reversal_reason = p_reason, reversal_journal_id = v_journal_id
    WHERE id = p_allocation_id;

    IF v_alloc.allocation_type = 'bill' THEN
        SELECT * INTO v_totals FROM bill_totals WHERE bill_id = v_alloc.bill_id;
        v_new_status := CASE
            WHEN v_totals.balance_due <= 0      THEN v_bill.status
            WHEN v_totals.pending_amount > 0    THEN 'awaiting_confirmation'
            ELSE 'open' END;
        UPDATE bills SET status = v_new_status, updated_by = p_user_id WHERE id = v_alloc.bill_id;
    END IF;

    v_new_alloc := v_txn.allocated_amount - v_alloc.amount;
    UPDATE mpesa_transactions
    SET allocated_amount = v_new_alloc,
        status = CASE WHEN v_new_alloc >= amount THEN 'allocated'
                      WHEN v_new_alloc > 0      THEN 'partially_allocated'
                      ELSE 'unallocated' END,
        updated_at = now()
    WHERE id = v_txn.id;

    RETURN json_build_object(
        'allocation_id', p_allocation_id,
        'transaction_id', v_txn.id,
        'amount', v_alloc.amount,
        'remaining', v_txn.amount - v_new_alloc,
        'bill_id', v_alloc.bill_id,
        'bill_status', v_new_status
    );
END;
$function$;
