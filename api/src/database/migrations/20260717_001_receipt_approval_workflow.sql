-- ============================================================================
-- 2026-07-17: Goods Receipt Approval Workflow
-- Run order: 1. ALTER TABLE, 2. replace functions, 3. seed permissions
-- Adds approval_status to inventory_receipts so POS users can submit
-- receipts that must be approved before inventory is updated.
-- ============================================================================

-- 1. Add approval tracking columns
ALTER TABLE inventory_receipts
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Modify post_inventory_purchase trigger to skip pending receipts
CREATE OR REPLACE FUNCTION public.post_inventory_purchase()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE
  v_approval_status    TEXT;
  v_inventory_account  UUID;
  v_ap_account         UUID;
  v_supplier_account   UUID;
  v_credit_account     UUID;
  v_journal_id         UUID;
  v_pre_stock          NUMERIC;
  v_pre_cost           NUMERIC;
  v_new_cost           NUMERIC;
BEGIN
  -- Skip posting if the receipt is still pending approval
  SELECT approval_status INTO v_approval_status
    FROM inventory_receipts
   WHERE id = NEW.receipt_id;

  IF v_approval_status = 'pending' THEN
    RETURN NEW;
  END IF;

  -- ========= 0. SNAPSHOT pre-purchase stock & cost for WAC =========
  SELECT current_stock, cost_price
    INTO v_pre_stock, v_pre_cost
    FROM products
   WHERE id = NEW.product_id;

  -- ========= 1. INVENTORY MOVEMENT =========
  INSERT INTO inventory_movements (
    product_id, movement_date, quantity, unit_cost,
    movement_type, reference_type, reference_id, notes
  ) VALUES (
    NEW.product_id, CURRENT_DATE, NEW.quantity, NEW.unit_cost,
    'purchase', 'inventory_receipt', NEW.receipt_id,
    'Inventory receipt – automatic posting'
  );

  -- ========= 2. JOURNAL ENTRY: DR Inventory / CR Accounts Payable =========
  SELECT inventory_account_id INTO v_inventory_account
    FROM inventory_items WHERE product_id = NEW.product_id;

  SELECT s.account_id INTO v_supplier_account
    FROM inventory_receipts r
    JOIN suppliers s ON s.id = r.supplier_id
   WHERE r.id = NEW.receipt_id;

  SELECT id INTO v_ap_account
    FROM chart_of_accounts WHERE code = '2100';

  v_credit_account := COALESCE(v_supplier_account, v_ap_account);

  IF v_inventory_account IS NOT NULL
    AND v_credit_account IS NOT NULL
    AND NEW.line_total > 0
  THEN
    SELECT id INTO v_journal_id
      FROM journal_entries
     WHERE source_type = 'inventory_receipt' AND source_id = NEW.receipt_id;

    IF v_journal_id IS NULL THEN
      INSERT INTO journal_entries (entry_date, source_type, source_id, description)
      VALUES (
        CURRENT_DATE, 'inventory_receipt', NEW.receipt_id,
        'Inventory purchase – ' || COALESCE(
          (SELECT invoice_number FROM inventory_receipts WHERE id = NEW.receipt_id),
          'no ref'
        )
      )
      RETURNING id INTO v_journal_id;
    END IF;

    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
    VALUES
      (v_journal_id, v_inventory_account, NEW.line_total, 0),
      (v_journal_id, v_credit_account,    0,              NEW.line_total);
  END IF;

  -- ========= 3. WEIGHTED AVERAGE COST UPDATE =========
  IF NEW.unit_cost IS NOT NULL AND NEW.unit_cost > 0 THEN
    IF v_pre_stock IS NULL OR v_pre_stock <= 0 OR v_pre_cost IS NULL OR v_pre_cost <= 0 THEN
      v_new_cost := NEW.unit_cost;
    ELSE
      v_new_cost := (v_pre_stock * v_pre_cost + NEW.quantity * NEW.unit_cost)
                    / (v_pre_stock + NEW.quantity);
    END IF;
    UPDATE products SET cost_price = ROUND(v_new_cost, 4) WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Function to approve a pending receipt and post its inventory
CREATE OR REPLACE FUNCTION public.approve_inventory_receipt(
  p_receipt_id UUID,
  p_approver_id UUID
) RETURNS VOID LANGUAGE plpgsql AS $function$
DECLARE
  v_item               RECORD;
  v_approval_status    TEXT;
  v_inventory_account  UUID;
  v_ap_account         UUID;
  v_supplier_account   UUID;
  v_credit_account     UUID;
  v_journal_id         UUID;
  v_pre_stock          NUMERIC;
  v_pre_cost           NUMERIC;
  v_new_cost           NUMERIC;
BEGIN
  -- Verify it's actually pending
  SELECT approval_status INTO v_approval_status
    FROM inventory_receipts WHERE id = p_receipt_id FOR UPDATE;

  IF v_approval_status IS NULL THEN
    RAISE EXCEPTION 'RECEIPT_NOT_FOUND';
  END IF;
  IF v_approval_status <> 'pending' THEN
    RAISE EXCEPTION 'RECEIPT_NOT_PENDING';
  END IF;

  -- Mark approved first so any re-entrant trigger calls would be safe
  UPDATE inventory_receipts
     SET approval_status = 'approved',
         approved_by     = p_approver_id,
         approved_at     = NOW()
   WHERE id = p_receipt_id;

  -- Post inventory movements + journals for each item (mirrors trigger logic)
  FOR v_item IN
    SELECT iri.product_id, iri.quantity, iri.unit_cost, iri.line_total
      FROM inventory_receipt_items iri
     WHERE iri.receipt_id = p_receipt_id
  LOOP
    -- WAC snapshot
    SELECT current_stock, cost_price
      INTO v_pre_stock, v_pre_cost
      FROM products WHERE id = v_item.product_id;

    -- Inventory movement
    INSERT INTO inventory_movements (
      product_id, movement_date, quantity, unit_cost,
      movement_type, reference_type, reference_id, notes
    ) VALUES (
      v_item.product_id, CURRENT_DATE, v_item.quantity, v_item.unit_cost,
      'purchase', 'inventory_receipt', p_receipt_id,
      'Inventory receipt – approved posting'
    );

    -- GL accounts
    SELECT inventory_account_id INTO v_inventory_account
      FROM inventory_items WHERE product_id = v_item.product_id;

    SELECT s.account_id INTO v_supplier_account
      FROM inventory_receipts r
      JOIN suppliers s ON s.id = r.supplier_id
     WHERE r.id = p_receipt_id;

    SELECT id INTO v_ap_account FROM chart_of_accounts WHERE code = '2100';
    v_credit_account := COALESCE(v_supplier_account, v_ap_account);

    IF v_inventory_account IS NOT NULL
      AND v_credit_account IS NOT NULL
      AND v_item.line_total > 0
    THEN
      SELECT id INTO v_journal_id
        FROM journal_entries
       WHERE source_type = 'inventory_receipt' AND source_id = p_receipt_id;

      IF v_journal_id IS NULL THEN
        INSERT INTO journal_entries (entry_date, source_type, source_id, description)
        VALUES (
          CURRENT_DATE, 'inventory_receipt', p_receipt_id,
          'Inventory purchase – ' || COALESCE(
            (SELECT invoice_number FROM inventory_receipts WHERE id = p_receipt_id),
            'no ref'
          )
        )
        RETURNING id INTO v_journal_id;
      END IF;

      INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
      VALUES
        (v_journal_id, v_inventory_account, v_item.line_total, 0),
        (v_journal_id, v_credit_account,    0,                 v_item.line_total);
    END IF;

    -- WAC update
    IF v_item.unit_cost IS NOT NULL AND v_item.unit_cost > 0 THEN
      IF v_pre_stock IS NULL OR v_pre_stock <= 0 OR v_pre_cost IS NULL OR v_pre_cost <= 0 THEN
        v_new_cost := v_item.unit_cost;
      ELSE
        v_new_cost := (v_pre_stock * v_pre_cost + v_item.quantity * v_item.unit_cost)
                      / (v_pre_stock + v_item.quantity);
      END IF;
      UPDATE products SET cost_price = ROUND(v_new_cost, 4) WHERE id = v_item.product_id;
    END IF;
  END LOOP;
END;
$function$;

-- 4. Update receive_inventory to accept optional approval_status
CREATE OR REPLACE FUNCTION public.receive_inventory(
  p_supplier_id     UUID,
  p_invoice_number  TEXT,
  p_purchase_date   DATE,
  p_total_amount    NUMERIC,
  p_created_by      UUID,
  p_line_items      JSONB,
  p_approval_status TEXT DEFAULT 'approved'
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_receipt_id UUID;
  v_item       JSONB;
BEGIN
  IF p_supplier_id IS NULL    THEN RAISE EXCEPTION 'SUPPLIER_REQUIRED'; END IF;
  IF p_invoice_number IS NULL THEN RAISE EXCEPTION 'INVOICE_NUMBER_REQUIRED'; END IF;
  IF p_purchase_date IS NULL  THEN RAISE EXCEPTION 'PURCHASE_DATE_REQUIRED'; END IF;
  IF jsonb_array_length(p_line_items) = 0 THEN RAISE EXCEPTION 'RECEIPT_ITEMS_REQUIRED'; END IF;

  INSERT INTO inventory_receipts (
    supplier_id, invoice_number, purchase_date,
    total_amount, created_by, approval_status
  ) VALUES (
    p_supplier_id, p_invoice_number, p_purchase_date,
    p_total_amount, p_created_by, p_approval_status
  )
  RETURNING id INTO v_receipt_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items) LOOP
    INSERT INTO inventory_receipt_items (
      receipt_id, product_id, quantity, unit_cost, line_total
    ) VALUES (
      v_receipt_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_cost')::NUMERIC,
      (v_item->>'line_total')::NUMERIC
    );
  END LOOP;

  RETURN v_receipt_id;
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

-- 5. Function to reject a pending receipt
CREATE OR REPLACE FUNCTION public.reject_inventory_receipt(
  p_receipt_id UUID,
  p_rejector_id UUID,
  p_reason TEXT
) RETURNS VOID LANGUAGE plpgsql AS $function$
DECLARE
  v_approval_status TEXT;
BEGIN
  SELECT approval_status INTO v_approval_status
    FROM inventory_receipts WHERE id = p_receipt_id FOR UPDATE;

  IF v_approval_status IS NULL THEN
    RAISE EXCEPTION 'RECEIPT_NOT_FOUND';
  END IF;
  IF v_approval_status <> 'pending' THEN
    RAISE EXCEPTION 'RECEIPT_NOT_PENDING';
  END IF;

  UPDATE inventory_receipts
     SET approval_status   = 'rejected',
         rejection_reason  = p_reason,
         approved_by       = p_rejector_id,
         approved_at       = NOW(),
         status            = 'cancelled'
   WHERE id = p_receipt_id;
END;
$function$;

-- 6. Seed receive_goods + approve_receipts onto owner (+ director if it exists)
UPDATE public.system_roles
SET permissions = permissions || '["receive_goods", "approve_receipts"]'::jsonb
WHERE code IN ('owner', 'director')
  AND NOT (permissions @> '["receive_goods"]'::jsonb);
