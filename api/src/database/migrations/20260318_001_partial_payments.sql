-- Enable partial payments and split payments (cash + mpesa on same bill)
-- Changes:
--   1. bill_totals view: add pending_amount and payable_amount columns
--   2. post_payment_journal: fix bug journaling v_totals.total instead of v_payment.amount
--   3. process_payment: allow partial amounts, multiple pending payments, split payment methods

-- ============================================================================
-- 1. BILL TOTALS VIEW — add pending_amount, payable_amount
-- ============================================================================
DROP VIEW IF EXISTS public.bill_totals;
CREATE OR REPLACE VIEW public.bill_totals AS
SELECT b.id AS bill_id,
    b.customer_name AS customer,
    b.created_by AS created_by_id,
    u.name AS created_by_name,
    COALESCE(item_totals.subtotal, (0)::numeric) AS subtotal,
    (0)::numeric AS tax,
    COALESCE(item_totals.subtotal, (0)::numeric) AS total,
    COALESCE(pay_totals.amount_paid, (0)::numeric) AS amount_paid,
    COALESCE(pay_totals.pending_amount, (0)::numeric) AS pending_amount,
    (
        COALESCE(item_totals.subtotal, (0)::numeric)
        - COALESCE(pay_totals.amount_paid, (0)::numeric)
    ) AS balance_due,
    (
        COALESCE(item_totals.subtotal, (0)::numeric)
        - COALESCE(pay_totals.amount_paid, (0)::numeric)
        - COALESCE(pay_totals.pending_amount, (0)::numeric)
    ) AS payable_amount
FROM bills b
LEFT JOIN profiles u ON u.id = b.created_by
LEFT JOIN LATERAL (
    SELECT sum(ri.quantity::numeric * ri.price) AS subtotal
    FROM rounds r
    JOIN round_items ri ON ri.round_id = r.id
    WHERE r.bill_id = b.id
) item_totals ON true
LEFT JOIN LATERAL (
    SELECT
        sum(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END) AS amount_paid,
        sum(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END) AS pending_amount
    FROM payments p
    WHERE p.bill_id = b.id
) pay_totals ON true;

-- ============================================================================
-- 2. POST PAYMENT JOURNAL — fix: use v_payment.amount, not v_totals.total
-- ============================================================================
CREATE OR REPLACE FUNCTION public.post_payment_journal(p_payment_id uuid) RETURNS void LANGUAGE plpgsql AS $function$
DECLARE v_payment payments %ROWTYPE;
v_cash_account uuid;
v_ar_account uuid;
v_journal_id uuid;
BEGIN
/* Idempotency guard */
IF EXISTS (
    SELECT 1
    FROM journal_entries
    WHERE source_type = 'payment'
        AND source_id = p_payment_id
) THEN RETURN;
END IF;
SELECT * INTO v_payment
FROM payments
WHERE id = p_payment_id;
IF v_payment.amount <= 0 THEN RAISE EXCEPTION 'Cannot journal zero-value payment';
END IF;
/* Resolve accounts */
SELECT id INTO v_cash_account
FROM chart_of_accounts
WHERE code = CASE
        WHEN v_payment.payment_type = 'cash' THEN '1010'
        ELSE '1020'
    END;
/* Revenue already recognized at round submission (Dr A/R, Cr Sales).
   Payment settles the receivable: Dr Cash/Bank, Cr A/R Open Bills. */
SELECT id INTO v_ar_account
FROM chart_of_accounts
WHERE code = '1201';
/* Create journal entry */
INSERT INTO journal_entries (
        entry_date,
        source_type,
        source_id,
        description
    )
VALUES (
        CURRENT_DATE,
        'payment',
        p_payment_id,
        'POS payment - settle A/R'
    )
RETURNING id INTO v_journal_id;
/* Dr Cash / Bank, Cr A/R Open Bills — use actual payment amount */
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
VALUES (v_journal_id, v_cash_account, v_payment.amount, 0),
    (v_journal_id, v_ar_account, 0, v_payment.amount);
END;
$function$;

-- ============================================================================
-- 3. PROCESS PAYMENT — partial payments, split payments, multi-pending
-- ============================================================================
DROP FUNCTION IF EXISTS public.process_payment(uuid, numeric, text, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.process_payment(
        p_bill_id uuid,
        p_amount numeric,
        p_payment_type text,
        p_user_id uuid,
        p_user_permissions jsonb DEFAULT '[]'::jsonb
    ) RETURNS json LANGUAGE plpgsql AS $function$
DECLARE v_bill bills %ROWTYPE;
v_totals RECORD;
v_can_approve boolean;
v_payment payments %ROWTYPE;
v_new_balance numeric;
v_new_status text;
BEGIN
v_can_approve := p_user_permissions @> '["approve_payments"]'::jsonb;
/* =====================================================
 Lock bill
 ===================================================== */
SELECT * INTO v_bill
FROM bills
WHERE id = p_bill_id FOR
UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Bill not found';
END IF;
IF v_bill.status NOT IN ('open', 'awaiting_confirmation') THEN
    RAISE EXCEPTION 'Bill is not payable (status: %)', v_bill.status;
END IF;
/* =====================================================
 Fetch authoritative totals
 ===================================================== */
SELECT * INTO v_totals
FROM bill_totals
WHERE bill_id = p_bill_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Bill totals not found';
END IF;
/* =====================================================
 CASE 2: CONFIRM ALL PENDING PAYMENTS (approve_payments)
 When bill is awaiting_confirmation and user can approve,
 confirm all pending payments in one go.
 p_amount is ignored — we use actual pending totals.
 ===================================================== */
IF v_can_approve
AND v_bill.status = 'awaiting_confirmation'
AND v_totals.pending_amount > 0 THEN
    /* Confirm all pending payments */
    FOR v_payment IN
        SELECT * FROM payments
        WHERE bill_id = p_bill_id AND status = 'pending'
        FOR UPDATE
    LOOP
        UPDATE payments
        SET status = 'confirmed',
            is_paid = true,
            updated_by = p_user_id,
            updated_at = now()
        WHERE id = v_payment.id;
        -- Accounting event per payment
        PERFORM post_payment_journal(v_payment.id);
    END LOOP;
    /* Re-read totals after confirmation */
    SELECT * INTO v_totals
    FROM bill_totals
    WHERE bill_id = p_bill_id;
    /* Determine new bill status */
    IF v_totals.balance_due <= 0 THEN
        v_new_status := 'completed';
    ELSE
        v_new_status := 'open';
    END IF;
    UPDATE bills SET status = v_new_status WHERE id = p_bill_id;
    RETURN json_build_object(
        'status', 'confirmed',
        'message', CASE WHEN v_new_status = 'completed'
            THEN 'Payments confirmed and bill completed'
            ELSE 'Payments confirmed. Bill has remaining balance'
        END,
        'balance_due', v_totals.balance_due,
        'amount_paid', v_totals.amount_paid,
        'pending_amount', 0
    );
END IF;
/* =====================================================
 Validate payment amount for new payments (Cases 1 & 3)
 ===================================================== */
IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive';
END IF;
IF NOT v_can_approve THEN
    /* Non-approvers: check against payable_amount (excludes pending) */
    IF p_amount > v_totals.payable_amount THEN
        RAISE EXCEPTION 'Amount % exceeds payable balance %. Paid: %, Pending: %',
            p_amount, v_totals.payable_amount, v_totals.amount_paid, v_totals.pending_amount;
    END IF;
ELSE
    /* Approvers: check against balance_due (confirmed only) */
    IF p_amount > v_totals.balance_due THEN
        RAISE EXCEPTION 'Amount % exceeds balance due %',
            p_amount, v_totals.balance_due;
    END IF;
END IF;
/* =====================================================
 CASE 1: NO approve_payments → INITIATE PAYMENT (PENDING)
 ===================================================== */
IF NOT v_can_approve THEN
    INSERT INTO payments (
            bill_id,
            amount,
            payment_type,
            status,
            is_paid,
            created_by
        )
    VALUES (
            p_bill_id,
            p_amount,
            p_payment_type,
            'pending',
            false,
            p_user_id
        );
    UPDATE bills
    SET status = 'awaiting_confirmation'
    WHERE id = p_bill_id;
    /* Re-read totals */
    SELECT * INTO v_totals
    FROM bill_totals
    WHERE bill_id = p_bill_id;
    RETURN json_build_object(
        'status', 'pending',
        'message', 'Payment awaiting confirmation',
        'balance_due', v_totals.balance_due,
        'amount_paid', v_totals.amount_paid,
        'pending_amount', v_totals.pending_amount
    );
END IF;
/* =====================================================
 CASE 3: DIRECT PAYMENT (approve_payments, open bill)
 ===================================================== */
IF v_can_approve THEN
    INSERT INTO payments (
            bill_id,
            amount,
            payment_type,
            status,
            is_paid,
            created_by,
            updated_by
        )
    VALUES (
            p_bill_id,
            p_amount,
            p_payment_type,
            'confirmed',
            true,
            p_user_id,
            p_user_id
        )
    RETURNING * INTO v_payment;
    -- Accounting event
    PERFORM post_payment_journal(v_payment.id);
    /* Re-read totals */
    SELECT * INTO v_totals
    FROM bill_totals
    WHERE bill_id = p_bill_id;
    /* Determine new bill status */
    IF v_totals.balance_due <= 0 THEN
        v_new_status := 'completed';
    ELSE
        v_new_status := 'open';
    END IF;
    UPDATE bills SET status = v_new_status WHERE id = p_bill_id;
    RETURN json_build_object(
        'status', 'confirmed',
        'message', CASE WHEN v_new_status = 'completed'
            THEN 'Payment completed'
            ELSE 'Partial payment recorded'
        END,
        'balance_due', v_totals.balance_due,
        'amount_paid', v_totals.amount_paid,
        'pending_amount', v_totals.pending_amount
    );
END IF;
RAISE EXCEPTION 'Invalid payment state or insufficient permissions';
END;
$function$;
