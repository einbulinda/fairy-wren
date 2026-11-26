-- Migration: M-Pesa IPN allocation to bills (KCB IPN phase 3)
-- Date: 2026-11-17
-- Description:
--   POS users map received M-Pesa notifications (mpesa_transactions) to bills.
--   Accounting (money already sits in 2300 from the receipt journal):
--     bill allocation  Dr 2300 M-Pesa Unallocated Receipts / Cr 1201 A/R Open Bills
--     tip allocation   Dr 2300 / Cr 2200 Staff Tips Payable
--     deposit          no journal; remainder stays in 2300 with a deposit label
--     reversal         mirror of the original allocation journal
--   Payments created here are confirmed immediately (bank-verified money) and
--   must NOT go through post_payment_journal (it debits 1020 again). The
--   journal written here uses source_type 'payment', so a later call to
--   post_payment_journal for the same payment is a no-op.

-- ── 1. Tips account ─────────────────────────────────────────────────────────
INSERT INTO public.chart_of_accounts (code, name, account_class, normal_balance, is_control_account, active)
SELECT '2200', 'Staff Tips Payable', 'current_liability', 'credit', false, true
WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE code = '2200');

-- ── 2. Deposit labelling on notifications ───────────────────────────────────
ALTER TABLE public.mpesa_transactions
    ADD COLUMN IF NOT EXISTS deposit_label     text,
    ADD COLUMN IF NOT EXISTS deposit_marked_by uuid REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS deposit_marked_at timestamptz;

-- ── 3. Allocations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mpesa_allocations (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mpesa_transaction_id  uuid NOT NULL REFERENCES public.mpesa_transactions(id),
    allocation_type       text NOT NULL CHECK (allocation_type IN ('bill', 'tip')),
    bill_id               uuid REFERENCES public.bills(id),     -- required for 'bill'; optional context for 'tip'
    payment_id            uuid REFERENCES public.payments(id),  -- 'bill' only
    amount                numeric(12, 2) NOT NULL CHECK (amount > 0),
    journal_entry_id      uuid REFERENCES public.journal_entries(id),
    allocated_by          uuid NOT NULL REFERENCES public.profiles(id),
    allocated_at          timestamptz NOT NULL DEFAULT now(),
    reversed_at           timestamptz,
    reversed_by           uuid REFERENCES public.profiles(id),
    reversal_reason       text,
    reversal_journal_id   uuid REFERENCES public.journal_entries(id),
    CONSTRAINT mpesa_allocations_bill_fields
        CHECK (allocation_type <> 'bill' OR (bill_id IS NOT NULL AND payment_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_mpesa_allocations_txn  ON public.mpesa_allocations (mpesa_transaction_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_allocations_bill ON public.mpesa_allocations (bill_id) WHERE reversed_at IS NULL;

-- ── 4. Real-time push to POS ────────────────────────────────────────────────
-- Not the generic notify_table_change(): full OLD+NEW rows (with raw_payload)
-- risk pg_notify's 8000-byte limit, which would abort the allocation itself.
-- Only the fields the POS needs are sent; no phone number.
CREATE OR REPLACE FUNCTION public.notify_mpesa_transaction_change()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
    PERFORM pg_notify('db_changes', json_build_object(
        'table', TG_TABLE_NAME,
        'event', TG_OP,
        'new', json_build_object(
            'id', NEW.id,
            'transaction_id', NEW.transaction_id,
            'amount', NEW.amount,
            'allocated_amount', NEW.allocated_amount,
            'status', NEW.status,
            'first_name', NEW.first_name,
            'deposit_label', NEW.deposit_label,
            'transaction_at', NEW.transaction_at
        ),
        'old', NULL
    )::text);
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_mpesa_transactions_notify ON public.mpesa_transactions;
CREATE TRIGGER trg_mpesa_transactions_notify
    AFTER INSERT OR UPDATE ON public.mpesa_transactions
    FOR EACH ROW EXECUTE FUNCTION notify_mpesa_transaction_change();

-- ── 5. Permissions (users must log in again to pick these up) ───────────────
UPDATE public.system_roles
SET permissions = permissions || '["allocate_mpesa"]'::jsonb
WHERE permissions @> '["pos_access"]'::jsonb
  AND NOT permissions @> '["allocate_mpesa"]'::jsonb;

UPDATE public.system_roles
SET permissions = permissions || '["manage_mpesa"]'::jsonb
WHERE code IN ('manager', 'owner')
  AND NOT permissions @> '["manage_mpesa"]'::jsonb;

-- ── 6. Allocate ─────────────────────────────────────────────────────────────
-- p_lines: [{ "type": "bill", "bill_id": uuid, "amount": n },
--           { "type": "tip",  "bill_id": uuid|null, "amount": n }]
-- p_deposit_label: when set, the amount left on the notification after these
--   lines is labelled as a deposit for a later bill. p_lines may then be empty.
-- Errors are raised with a code as the message (MPESA_*), mapped by the API.
CREATE OR REPLACE FUNCTION public.allocate_mpesa_transaction(
    p_txn_id uuid,
    p_lines jsonb,
    p_user_id uuid,
    p_deposit_label text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql AS $function$
DECLARE
    v_txn        mpesa_transactions%ROWTYPE;
    v_bill       bills%ROWTYPE;
    v_totals     RECORD;
    v_line       jsonb;
    v_type       text;
    v_amount     numeric;
    v_bill_id    uuid;
    v_total      numeric := 0;
    v_remaining  numeric;
    v_new_alloc  numeric;
    v_clearing   uuid;
    v_ar         uuid;
    v_tips       uuid;
    v_payment_id uuid;
    v_journal_id uuid;
    v_alloc_id   uuid;
    v_new_status text;
    v_label      text := NULLIF(btrim(p_deposit_label), '');
    v_bills      jsonb := '[]'::jsonb;
    v_tip_total  numeric := 0;
BEGIN
    SELECT * INTO v_txn FROM mpesa_transactions WHERE id = p_txn_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'MPESA_TRANSACTION_NOT_FOUND';
    END IF;

    -- Money must be in 2300 before it can leave it (no-op if already posted).
    IF v_txn.receipt_journal_id IS NULL THEN
        PERFORM post_mpesa_receipt_journal(p_txn_id);
    END IF;

    v_remaining := v_txn.amount - v_txn.allocated_amount;

    IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' THEN
        RAISE EXCEPTION 'MPESA_INVALID_ALLOCATION' USING DETAIL = 'lines must be an array';
    END IF;
    IF jsonb_array_length(p_lines) = 0 AND v_label IS NULL THEN
        RAISE EXCEPTION 'MPESA_INVALID_ALLOCATION' USING DETAIL = 'nothing to allocate';
    END IF;

    /* ── Validate lines ── */
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
        v_type := v_line->>'type';
        IF v_type NOT IN ('bill', 'tip') THEN
            RAISE EXCEPTION 'MPESA_INVALID_ALLOCATION' USING DETAIL = format('invalid type %s', v_type);
        END IF;
        IF COALESCE(v_line->>'amount', '') !~ '^\d+(\.\d{1,2})?$' OR (v_line->>'amount')::numeric <= 0 THEN
            RAISE EXCEPTION 'MPESA_INVALID_ALLOCATION' USING DETAIL = 'each line needs a positive amount';
        END IF;
        IF v_type = 'bill' AND (v_line->>'bill_id') IS NULL THEN
            RAISE EXCEPTION 'MPESA_INVALID_ALLOCATION' USING DETAIL = 'bill line needs bill_id';
        END IF;
        v_total := v_total + (v_line->>'amount')::numeric;
    END LOOP;

    IF v_total > v_remaining THEN
        RAISE EXCEPTION 'MPESA_OVER_ALLOCATED'
            USING DETAIL = format('allocating %s but only %s remains on %s', v_total, v_remaining, v_txn.transaction_id);
    END IF;

    SELECT id INTO v_clearing FROM chart_of_accounts WHERE code = '2300';
    SELECT id INTO v_ar       FROM chart_of_accounts WHERE code = '1201';
    SELECT id INTO v_tips     FROM chart_of_accounts WHERE code = '2200';
    IF v_clearing IS NULL OR v_ar IS NULL OR v_tips IS NULL THEN
        RAISE EXCEPTION 'Missing GL account 2300, 1201 or 2200';
    END IF;

    /* ── Apply lines (bills locked in id order to avoid deadlocks) ── */
    FOR v_line IN
        SELECT value FROM jsonb_array_elements(p_lines)
        ORDER BY value->>'type', value->>'bill_id'
    LOOP
        v_type    := v_line->>'type';
        v_amount  := (v_line->>'amount')::numeric;
        v_bill_id := NULLIF(v_line->>'bill_id', '')::uuid;

        IF v_type = 'bill' THEN
            SELECT * INTO v_bill FROM bills WHERE id = v_bill_id FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'MPESA_BILL_NOT_FOUND' USING DETAIL = v_bill_id::text;
            END IF;
            IF v_bill.status NOT IN ('open', 'awaiting_confirmation') THEN
                RAISE EXCEPTION 'MPESA_BILL_NOT_PAYABLE'
                    USING DETAIL = format('bill %s is %s', v_bill.customer_name, v_bill.status);
            END IF;

            SELECT * INTO v_totals FROM bill_totals WHERE bill_id = v_bill_id;
            IF v_amount > v_totals.payable_amount THEN
                RAISE EXCEPTION 'MPESA_EXCEEDS_BILL_BALANCE'
                    USING DETAIL = format('bill %s can take at most %s', v_bill.customer_name, v_totals.payable_amount);
            END IF;

            INSERT INTO payments (bill_id, amount, payment_type, mpesa_code, status, is_paid, created_by, updated_by)
            VALUES (v_bill_id, v_amount, 'mpesa', v_txn.transaction_id, 'confirmed', true, p_user_id, p_user_id)
            RETURNING id INTO v_payment_id;

            INSERT INTO journal_entries (entry_date, source_type, source_id, reference, description)
            VALUES (CURRENT_DATE, 'payment', v_payment_id, v_txn.transaction_id,
                    'M-Pesa ' || v_txn.transaction_id || ' applied to bill - settle A/R')
            RETURNING id INTO v_journal_id;

            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES (v_journal_id, v_clearing, v_amount, 0),
                   (v_journal_id, v_ar,       0,        v_amount);

            INSERT INTO mpesa_allocations
                (mpesa_transaction_id, allocation_type, bill_id, payment_id, amount, journal_entry_id, allocated_by)
            VALUES (p_txn_id, 'bill', v_bill_id, v_payment_id, v_amount, v_journal_id, p_user_id);

            SELECT * INTO v_totals FROM bill_totals WHERE bill_id = v_bill_id;
            v_new_status := CASE WHEN v_totals.balance_due <= 0 THEN 'completed' ELSE v_bill.status END;
            UPDATE bills SET status = v_new_status, updated_by = p_user_id WHERE id = v_bill_id;

            v_bills := v_bills || jsonb_build_object(
                'bill_id', v_bill_id,
                'customer_name', v_bill.customer_name,
                'amount', v_amount,
                'balance_due', v_totals.balance_due,
                'status', v_new_status
            );

        ELSE -- tip
            IF v_bill_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bills WHERE id = v_bill_id) THEN
                RAISE EXCEPTION 'MPESA_BILL_NOT_FOUND' USING DETAIL = v_bill_id::text;
            END IF;

            INSERT INTO mpesa_allocations
                (mpesa_transaction_id, allocation_type, bill_id, amount, allocated_by)
            VALUES (p_txn_id, 'tip', v_bill_id, v_amount, p_user_id)
            RETURNING id INTO v_alloc_id;

            INSERT INTO journal_entries (entry_date, source_type, source_id, reference, description)
            VALUES (CURRENT_DATE, 'mpesa_tip', v_alloc_id, v_txn.transaction_id,
                    'M-Pesa ' || v_txn.transaction_id || ' overpayment kept as staff tip')
            RETURNING id INTO v_journal_id;

            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES (v_journal_id, v_clearing, v_amount, 0),
                   (v_journal_id, v_tips,     0,        v_amount);

            UPDATE mpesa_allocations SET journal_entry_id = v_journal_id WHERE id = v_alloc_id;
            v_tip_total := v_tip_total + v_amount;
        END IF;
    END LOOP;

    /* ── Update the notification ── */
    v_new_alloc := v_txn.allocated_amount + v_total;

    UPDATE mpesa_transactions
    SET allocated_amount  = v_new_alloc,
        status            = CASE WHEN v_new_alloc >= amount THEN 'allocated'
                                 WHEN v_new_alloc > 0      THEN 'partially_allocated'
                                 ELSE 'unallocated' END,
        deposit_label     = CASE WHEN v_label IS NOT NULL AND v_new_alloc < amount THEN v_label ELSE deposit_label END,
        deposit_marked_by = CASE WHEN v_label IS NOT NULL AND v_new_alloc < amount THEN p_user_id ELSE deposit_marked_by END,
        deposit_marked_at = CASE WHEN v_label IS NOT NULL AND v_new_alloc < amount THEN now() ELSE deposit_marked_at END,
        updated_at        = now()
    WHERE id = p_txn_id;

    RETURN json_build_object(
        'transaction_id', p_txn_id,
        'receipt', v_txn.transaction_id,
        'allocated', v_total,
        'tip', v_tip_total,
        'remaining', v_txn.amount - v_new_alloc,
        'deposit_label', CASE WHEN v_new_alloc < v_txn.amount THEN COALESCE(v_label, v_txn.deposit_label) END,
        'bills', v_bills
    );
END;
$function$;

-- ── 7. Reverse an allocation (manager) ──────────────────────────────────────
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
