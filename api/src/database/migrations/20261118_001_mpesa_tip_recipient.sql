-- Migration: Name the staff member an M-Pesa tip is for
-- Date: 2026-11-18
-- Description:
--   Tip allocations (excess on an M-Pesa payment kept as a tip) now record who
--   the tip is in favour of. allocate_mpesa_transaction requires an active
--   staff member (profiles) with role supervisor, bartender, manager or
--   waitress as `recipient_id` on every tip line (owners and stock control
--   are excluded).
--   Supersedes the function from 20261117_001; only the tip handling changed.

ALTER TABLE public.mpesa_allocations
    ADD COLUMN IF NOT EXISTS tip_recipient_id uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_mpesa_allocations_tip_recipient
    ON public.mpesa_allocations (tip_recipient_id)
    WHERE allocation_type = 'tip';

-- p_lines: [{ "type": "bill", "bill_id": uuid, "amount": n },
--           { "type": "tip",  "bill_id": uuid|null, "recipient_id": uuid, "amount": n }]
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
    v_recipient  uuid;
    v_recipient_name text;
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
    v_tips_out   jsonb := '[]'::jsonb;
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
        IF v_type = 'tip' THEN
            IF NULLIF(v_line->>'recipient_id', '') IS NULL THEN
                RAISE EXCEPTION 'MPESA_INVALID_ALLOCATION' USING DETAIL = 'tip line needs recipient_id';
            END IF;
            -- Tips go to floor staff only (keep in sync with mpesa.repository listStaff)
            IF NOT EXISTS (
                SELECT 1 FROM profiles
                WHERE id = (v_line->>'recipient_id')::uuid
                  AND COALESCE(active, true)
                  AND role IN ('supervisor', 'bartender', 'manager', 'waitress')
            ) THEN
                RAISE EXCEPTION 'MPESA_TIP_RECIPIENT_NOT_FOUND' USING DETAIL = v_line->>'recipient_id';
            END IF;
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

            v_recipient := (v_line->>'recipient_id')::uuid;
            SELECT name INTO v_recipient_name FROM profiles WHERE id = v_recipient;

            INSERT INTO mpesa_allocations
                (mpesa_transaction_id, allocation_type, bill_id, tip_recipient_id, amount, allocated_by)
            VALUES (p_txn_id, 'tip', v_bill_id, v_recipient, v_amount, p_user_id)
            RETURNING id INTO v_alloc_id;

            INSERT INTO journal_entries (entry_date, source_type, source_id, reference, description)
            VALUES (CURRENT_DATE, 'mpesa_tip', v_alloc_id, v_txn.transaction_id,
                    'M-Pesa ' || v_txn.transaction_id || ' overpayment kept as tip for ' || v_recipient_name)
            RETURNING id INTO v_journal_id;

            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES (v_journal_id, v_clearing, v_amount, 0),
                   (v_journal_id, v_tips,     0,        v_amount);

            UPDATE mpesa_allocations SET journal_entry_id = v_journal_id WHERE id = v_alloc_id;
            v_tip_total := v_tip_total + v_amount;
            v_tips_out := v_tips_out || jsonb_build_object(
                'recipient_id', v_recipient,
                'recipient_name', v_recipient_name,
                'amount', v_amount
            );
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
        'tips', v_tips_out,
        'remaining', v_txn.amount - v_new_alloc,
        'deposit_label', CASE WHEN v_new_alloc < v_txn.amount THEN COALESCE(v_label, v_txn.deposit_label) END,
        'bills', v_bills
    );
END;
$function$;
