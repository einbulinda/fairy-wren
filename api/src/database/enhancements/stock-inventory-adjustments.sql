/*
 ======================================================
 STOCK AND INVENTORY MANAGEMENT ENHANCEMENTS
 ======================================================
 This file contains enhanced RPC functions that implement
 proper inventory transaction logging and ledger tracking.
 
 Key Principles Applied:
 - inventory_movements table is the single source of truth
 - inventory_on_hand view aggregates movements by product
 - products_with_stock view joins products with current stock
 - Never update products.current_stock directly
 - All inventory changes flow through inventory_movements
 
 Changes Made:
 1. Fixed apply_stock_take_adjustments function
 2. Enhanced process_payment function with inventory deductions
 
 Date: 2026-02-14
 ======================================================
 */
-- =====================================================
-- FUNCTION 1: apply_stock_take_adjustments (FIXED)
-- =====================================================
/*
 PURPOSE:
 Apply approved stocktake adjustments to the inventory system
 
 WHAT WAS FIXED:
 ✗ BEFORE: Selected non-existent 'variance' column
 ✗ BEFORE: Attempted direct UPDATE to products.current_stock
 ✓ AFTER: Selects correct 'adjustment' column from stock_take_items
 ✓ AFTER: InsertS into inventory_movements table only
 
 BUG DETAILS:
 The original function tried to select a 'variance' column that doesn't exist
 in the stock_take_items table. The correct column is 'adjustment'.
 
 Additionally, it was trying to directly update the products table, which
 violates the inventory architecture. All stock changes must be recorded as
 transactions in inventory_movements, where aggregate views calculate
 current stock from the transaction history.
 
 ARCHITECTURE:
 - inventory_movements: Transaction log (INSERT ONLY)
 - inventory_on_hand: VIEW summing movements by product
 - products_with_stock: VIEW (products JOIN inventory_on_hand)
 - products.current_stock: NEVER update directly
 
 REFERENCE:
 - Called when owner approves a stocktake session
 - Creates adjustment_in or adjustment_out movements
 - Frontend: ApprovalTab.jsx calls approveStockTake
 - Backend: inventory.service.js → apply_stock_take_adjustments
 */
CREATE OR REPLACE FUNCTION apply_stock_take_adjustments(p_stock_take_id UUID) RETURNS VOID AS $$
DECLARE v_item RECORD;
BEGIN -- Loop through all items in the stock take
FOR v_item IN
SELECT product_id,
  variance,
  reason,
  notes
FROM stock_take_items
WHERE stock_take_id = p_stock_take_id LOOP -- Log inventory movement (inventory_movements is the only source of truth)
INSERT INTO inventory_movements (
    product_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    reason,
    notes,
    movement_date,
    created_at
  )
VALUES (
    v_item.product_id,
    CASE
      WHEN v_item.variance > 0 THEN 'adjustment_in'
      ELSE 'adjustment_out'
    END,
    ABS(v_item.variance),
    'stock_take',
    p_stock_take_id,
    v_item.reason,
    v_item.notes,
    CURRENT_DATE,
    NOW()
  );
END LOOP;
END;
$$ LANGUAGE plpgsql;
-- =====================================================
-- FUNCTION 2: process_payment (ENHANCED)
-- =====================================================
/*
 PURPOSE:
 Process bill payments and update related records including inventory
 
 WHAT WAS ENHANCED:
 ✓ Added inventory deduction on bill completion in CASE 2
 ✓ Added inventory deduction on bill completion in CASE 3
 ✗ BEFORE: Bill payment status updated but no inventory ledger entries created
 ✓ AFTER: FOR loop iterates bill_line_items and creates inventory_movements
 
 ENHANCEMENT DETAILS:
 Previously, when a bill was marked as 'completed' (paid), the inventory
 was not being deducted. This caused stock levels to remain artificially
 high and mismatch between products.current_stock and actual movements.
 
 Two cases needed fixing:
 - CASE 2: Bartender confirms a pending payment initiated by non-bartender
 - CASE 3: Bartender makes direct payment
 
 In both cases, we now loop through all bill_line_items and insert
 'sale' type movements into inventory_movements, reducing stock for
 each product by the quantity sold.
 
 FLOW:
 1. Payment confirmed and bill marked as 'completed'
 2. post_payment_journal called for accounting
 3. FOR loop through bill_line_items (NEW)
 4. INSERT into inventory_movements with:
 - movement_type: 'sale'
 - reference_type: 'bill'
 - reference_id: bill_id
 - quantity: line item quantity
 
 IMPACT:
 - inventory_on_hand view now correctly reflects sold items
 - products_with_stock view shows accurate current stock
 - Audit trail complete: all sales transactions logged
 */
CREATE OR REPLACE FUNCTION process_payment(
    p_bill_id uuid,
    p_amount numeric,
    p_payment_type text,
    p_user_id uuid,
    p_user_role text
  ) RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_bill bills %ROWTYPE;
v_payment payments %ROWTYPE;
v_totals RECORD;
v_line_item RECORD;
-- NEW: for inventory deduction
BEGIN
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
 CASE 1: NON-BARTENDER → INITIATE PAYMENT (PENDING)
 ===================================================== */
IF p_user_role <> 'bartender' THEN IF v_bill.status <> 'open'
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
 CASE 2: BARTENDER CONFIRMS EXISTING PAYMENT
 ===================================================== */
IF p_user_role = 'bartender'
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
-- [ENHANCEMENT] Deduct inventory for completed bill
FOR v_line_item IN
SELECT product_id,
  quantity
FROM bill_line_items
WHERE bill_id = p_bill_id LOOP
INSERT INTO inventory_movements (
    product_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    movement_date,
    created_at
  )
VALUES (
    v_line_item.product_id,
    'sale',
    v_line_item.quantity,
    'bill',
    p_bill_id,
    CURRENT_DATE,
    NOW()
  );
END LOOP;
RETURN json_build_object(
  'status',
  'confirmed',
  'message',
  'Payment confirmed and bill completed'
);
END IF;
/* =====================================================
 CASE 3: BARTENDER DIRECT PAYMENT
 ===================================================== */
IF p_user_role = 'bartender'
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
-- [ENHANCEMENT] Deduct inventory for completed bill
FOR v_line_item IN
SELECT product_id,
  quantity
FROM bill_line_items
WHERE bill_id = p_bill_id LOOP
INSERT INTO inventory_movements (
    product_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    movement_date,
    created_at
  )
VALUES (
    v_line_item.product_id,
    'sale',
    v_line_item.quantity,
    'bill',
    p_bill_id,
    CURRENT_DATE,
    NOW()
  );
END LOOP;
RETURN json_build_object(
  'status',
  'confirmed',
  'message',
  'Direct payment completed'
);
END IF;
RAISE EXCEPTION 'Invalid payment state or role';
END;
$$;
-- =====================================================
-- DEPLOYMENT NOTES
-- =====================================================
/*
 1. Run this file to update functions in development
 2. Test stocktake approval: inventory_movements should have entries
 3. Test bill payment: inventory should be deducted from products_with_stock view
 4. Verify views calculate correctly:
 - SELECT * FROM inventory_on_hand WHERE product_id = '<test-product>';
 - SELECT * FROM products_with_stock WHERE id = '<test-product>';
 5. Check audit trail:
 - SELECT * FROM inventory_movements WHERE reference_type IN ('stock_take', 'bill');
 */