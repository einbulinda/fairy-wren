-- Fix: Remove pending_amount > 0 guard from confirm branch
-- When a bill is awaiting_confirmation, the approver should always be able
-- to confirm it — even if pending_amount is 0 (e.g. payments were already
-- confirmed through another path). The branch now recalculates totals and
-- resolves the bill status regardless.

CREATE OR REPLACE FUNCTION public.process_payment(
        p_bill_id uuid,
        p_payments jsonb,
        p_user_id uuid,
        p_user_permissions jsonb DEFAULT '[]'::jsonb
    ) RETURNS json LANGUAGE plpgsql AS $function$
DECLARE v_bill bills %ROWTYPE;
v_totals RECORD;
v_can_approve boolean;
v_payment payments %ROWTYPE;
v_line jsonb;
v_line_amount numeric;
v_line_type text;
v_lines_total numeric := 0;
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
 p_payments is ignored — we use actual pending totals.
 ===================================================== */
IF v_can_approve
AND v_bill.status = 'awaiting_confirmation' THEN
    -- Confirm any remaining pending payments
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
        PERFORM post_payment_journal(v_payment.id);
    END LOOP;
    -- Recalculate totals and resolve bill status
    SELECT * INTO v_totals FROM bill_totals WHERE bill_id = p_bill_id;
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
 Validate payment lines
 ===================================================== */
IF p_payments IS NULL OR jsonb_array_length(p_payments) = 0 THEN
    RAISE EXCEPTION 'At least one payment line is required';
END IF;
FOR v_line IN SELECT * FROM jsonb_array_elements(p_payments)
LOOP
    v_line_amount := (v_line->>'amount')::numeric;
    v_line_type := v_line->>'method';
    IF v_line_amount IS NULL OR v_line_amount <= 0 THEN
        RAISE EXCEPTION 'Each payment line must have a positive amount';
    END IF;
    IF v_line_type IS NULL OR v_line_type NOT IN ('cash', 'mpesa') THEN
        RAISE EXCEPTION 'Invalid payment type: %', v_line_type;
    END IF;
    v_lines_total := v_lines_total + v_line_amount;
END LOOP;
IF NOT v_can_approve THEN
    IF v_lines_total > v_totals.payable_amount THEN
        RAISE EXCEPTION 'Total % exceeds payable balance %. Paid: %, Pending: %',
            v_lines_total, v_totals.payable_amount, v_totals.amount_paid, v_totals.pending_amount;
    END IF;
ELSE
    IF v_lines_total > v_totals.balance_due THEN
        RAISE EXCEPTION 'Total % exceeds balance due %',
            v_lines_total, v_totals.balance_due;
    END IF;
END IF;
/* =====================================================
 CASE 1: NO approve_payments → INITIATE PAYMENTS (PENDING)
 ===================================================== */
IF NOT v_can_approve THEN
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO payments (bill_id, amount, payment_type, status, is_paid, created_by)
        VALUES (
            p_bill_id,
            (v_line->>'amount')::numeric,
            v_line->>'method',
            'pending',
            false,
            p_user_id
        );
    END LOOP;
    UPDATE bills SET status = 'awaiting_confirmation' WHERE id = p_bill_id;
    SELECT * INTO v_totals FROM bill_totals WHERE bill_id = p_bill_id;
    RETURN json_build_object(
        'status', 'pending',
        'message', 'Payment awaiting confirmation',
        'balance_due', v_totals.balance_due,
        'amount_paid', v_totals.amount_paid,
        'pending_amount', v_totals.pending_amount
    );
END IF;
/* =====================================================
 CASE 3: DIRECT PAYMENTS (approve_payments)
 ===================================================== */
IF v_can_approve THEN
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO payments (bill_id, amount, payment_type, status, is_paid, created_by, updated_by)
        VALUES (
            p_bill_id,
            (v_line->>'amount')::numeric,
            v_line->>'method',
            'confirmed',
            true,
            p_user_id,
            p_user_id
        )
        RETURNING * INTO v_payment;
        PERFORM post_payment_journal(v_payment.id);
    END LOOP;
    SELECT * INTO v_totals FROM bill_totals WHERE bill_id = p_bill_id;
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
