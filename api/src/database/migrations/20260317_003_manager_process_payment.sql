-- Refactor process_payment to use permissions instead of hardcoded role names
-- Also grant approve_payments permission to manager role

-- 1. Add approve_payments to manager role
UPDATE public.system_roles
SET permissions = '["pos_access", "stock_take", "approve_payments", "view_all_bills"]'::jsonb
WHERE code = 'manager';

-- 2. Drop the old function signature (parameter type changed)
DROP FUNCTION IF EXISTS public.process_payment(uuid, numeric, text, uuid, text);

-- 3. Recreate with permission-based logic
CREATE OR REPLACE FUNCTION public.process_payment(
        p_bill_id uuid,
        p_amount numeric,
        p_payment_type text,
        p_user_id uuid,
        p_user_permissions jsonb DEFAULT '[]'::jsonb
    ) RETURNS json LANGUAGE plpgsql AS $function$
DECLARE v_bill bills %ROWTYPE;
v_payment payments %ROWTYPE;
v_totals RECORD;
v_line_item RECORD;
v_can_approve boolean;
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
/* =====================================================
 Fetch authoritative totals
 ===================================================== */
SELECT * INTO v_totals
FROM bill_totals
WHERE bill_id = p_bill_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Bill totals not found';
END IF;
/* =====================================================
 Enforce payment amount = outstanding balance
 ===================================================== */
IF p_amount <> v_totals.balance_due THEN RAISE EXCEPTION 'Only full payment is allowed. Expected %, received %',
v_totals.balance_due,
p_amount;
END IF;
/* =====================================================
 Lock existing payment (if any)
 ===================================================== */
SELECT * INTO v_payment
FROM payments
WHERE bill_id = p_bill_id
    AND status IN ('pending', 'confirmed') FOR
UPDATE;
/* =====================================================
 CASE 1: NO approve_payments → INITIATE PAYMENT (PENDING)
 ===================================================== */
IF NOT v_can_approve THEN IF v_bill.status <> 'open'
OR v_payment.id IS NOT NULL THEN RAISE EXCEPTION 'Payment already initiated or bill not open';
END IF;
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
RETURN json_build_object(
    'status',
    'pending',
    'message',
    'Payment awaiting confirmation'
);
END IF;
/* =====================================================
 CASE 2: CONFIRM EXISTING PAYMENT (approve_payments)
 ===================================================== */
IF v_can_approve
AND v_payment.id IS NOT NULL
AND v_payment.status = 'pending'
AND v_bill.status = 'awaiting_confirmation' THEN
UPDATE payments
SET status = 'confirmed',
    is_paid = true,
    updated_by = p_user_id,
    updated_at = now()
WHERE id = v_payment.id;
-- Accounting event
PERFORM post_payment_journal(v_payment.id);
UPDATE bills
SET status = 'completed'
WHERE id = p_bill_id;
-- Inventory already deducted at round submission via post_round_sale()
RETURN json_build_object(
    'status',
    'confirmed',
    'message',
    'Payment confirmed and bill completed'
);
END IF;
/* =====================================================
 CASE 3: DIRECT PAYMENT (approve_payments)
 ===================================================== */
IF v_can_approve
AND v_payment.id IS NULL
AND v_bill.status = 'open' THEN
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
UPDATE bills
SET status = 'completed'
WHERE id = p_bill_id;
-- Inventory already deducted at round submission via post_round_sale()
RETURN json_build_object(
    'status',
    'confirmed',
    'message',
    'Direct payment completed'
);
END IF;
RAISE EXCEPTION 'Invalid payment state or insufficient permissions';
END;
$function$;
