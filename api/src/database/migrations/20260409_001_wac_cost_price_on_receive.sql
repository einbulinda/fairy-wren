-- Migration: 20260409_001_wac_cost_price_on_receive.sql
-- Purpose: Update products.cost_price using Weighted Average Cost (WAC) whenever
--          inventory is received via a purchase receipt.
--
-- Formula: new_cost = (pre_purchase_stock × old_cost + qty_received × unit_cost)
--                     / (pre_purchase_stock + qty_received)
--
-- Edge cases:
--   - Product has no existing cost or zero stock → use purchase unit_cost directly
--   - unit_cost is NULL or 0 on the receipt line → skip update (treat as free/unknown)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.post_inventory_purchase()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE
  v_inventory_account  UUID;
  v_ap_account         UUID;
  v_supplier_account   UUID;
  v_credit_account     UUID;
  v_journal_id         UUID;
  -- WAC variables (snapshot taken before movement is inserted)
  v_pre_stock          NUMERIC;
  v_pre_cost           NUMERIC;
  v_new_cost           NUMERIC;
BEGIN

  -- ========= 0. SNAPSHOT pre-purchase stock & cost for WAC =========
  -- Must happen before the inventory_movements INSERT below, because that
  -- INSERT fires trg_update_inventory which updates products.current_stock.
  SELECT current_stock, cost_price
    INTO v_pre_stock, v_pre_cost
    FROM products
   WHERE id = NEW.product_id;

  -- ========= 1. INVENTORY MOVEMENT =========
  INSERT INTO inventory_movements (
    product_id,
    movement_date,
    quantity,
    unit_cost,
    movement_type,
    reference_type,
    reference_id,
    notes
  ) VALUES (
    NEW.product_id,
    CURRENT_DATE,
    NEW.quantity,
    NEW.unit_cost,
    'purchase',
    'inventory_receipt',
    NEW.receipt_id,
    'Inventory receipt – automatic posting'
  );

  -- ========= 2. JOURNAL ENTRY: DR Inventory / CR Accounts Payable =========
  SELECT inventory_account_id INTO v_inventory_account
    FROM inventory_items
   WHERE product_id = NEW.product_id;

  SELECT s.account_id INTO v_supplier_account
    FROM inventory_receipts r
    JOIN suppliers s ON s.id = r.supplier_id
   WHERE r.id = NEW.receipt_id;

  SELECT id INTO v_ap_account
    FROM chart_of_accounts
   WHERE code = '2100';

  v_credit_account := COALESCE(v_supplier_account, v_ap_account);

  IF v_inventory_account IS NOT NULL
    AND v_credit_account IS NOT NULL
    AND NEW.line_total > 0
  THEN
    -- Reuse existing journal entry for this receipt, or create a new one
    SELECT id INTO v_journal_id
      FROM journal_entries
     WHERE source_type = 'inventory_receipt'
       AND source_id   = NEW.receipt_id;

    IF v_journal_id IS NULL THEN
      INSERT INTO journal_entries (entry_date, source_type, source_id, description)
      VALUES (
        CURRENT_DATE,
        'inventory_receipt',
        NEW.receipt_id,
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
  -- Only update when a real cost is provided on the receipt line.
  IF NEW.unit_cost IS NOT NULL AND NEW.unit_cost > 0 THEN
    IF v_pre_stock IS NULL OR v_pre_stock <= 0 OR v_pre_cost IS NULL OR v_pre_cost <= 0 THEN
      -- No meaningful existing stock/cost → adopt purchase price directly
      v_new_cost := NEW.unit_cost;
    ELSE
      -- Standard WAC formula
      v_new_cost := (v_pre_stock * v_pre_cost + NEW.quantity * NEW.unit_cost)
                    / (v_pre_stock + NEW.quantity);
    END IF;

    UPDATE products
       SET cost_price = ROUND(v_new_cost, 4)
     WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$function$;
