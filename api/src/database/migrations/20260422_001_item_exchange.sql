-- Migration: Item Exchange feature
-- Adds exchange tracking + return line items to round_items

-- 1. Add exchange tracking + return flag columns to round_items
ALTER TABLE public.round_items
  ADD COLUMN IF NOT EXISTS is_exchanged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS exchanged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exchange_note TEXT,
  ADD COLUMN IF NOT EXISTS is_return BOOLEAN DEFAULT false;

-- 2. Add exchange_items permission to manager and owner roles
UPDATE public.system_roles
SET permissions = permissions || '["exchange_items"]'::jsonb
WHERE code IN ('manager', 'owner')
  AND NOT (permissions @> '["exchange_items"]'::jsonb);

-- 3. Update reverse_bill_sale to:
--    a) Skip is_return lines (they never had inventory deducted)
--    b) Deduct quantities already restored by partial exchanges so there is no double-reversal
CREATE OR REPLACE FUNCTION public.reverse_bill_sale(p_bill_id uuid) RETURNS void LANGUAGE plpgsql AS $function$
DECLARE
  v_round            RECORD;
  v_item             RECORD;
  v_entry            RECORD;
  v_reversal_id      UUID;
  v_avg_cost         NUMERIC;
  v_already_returned NUMERIC;
  v_net_qty          NUMERIC;
BEGIN
  FOR v_round IN
    SELECT id FROM rounds WHERE bill_id = p_bill_id
  LOOP
    FOR v_item IN
      SELECT ri.id, ri.product_id, ri.quantity
      FROM round_items ri
      WHERE ri.round_id = v_round.id
        AND ri.inventory_posted = true
        AND COALESCE(ri.is_return, false) = false
    LOOP
      -- How much has already been restored via partial/full exchange reversals?
      SELECT COALESCE(SUM(im.quantity), 0) INTO v_already_returned
      FROM inventory_movements im
      WHERE im.reference_type = 'exchange'
        AND im.reference_id = v_item.id
        AND im.product_id = v_item.product_id;

      v_net_qty := v_item.quantity - v_already_returned;

      IF v_net_qty > 0 THEN
        SELECT COALESCE(unit_cost, 0) INTO v_avg_cost
        FROM inventory_movements
        WHERE reference_type = 'round'
          AND reference_id = v_round.id
          AND product_id = v_item.product_id
          AND quantity < 0
        LIMIT 1;
        IF v_avg_cost IS NULL THEN v_avg_cost := 0; END IF;

        INSERT INTO inventory_movements (
          product_id, movement_date, quantity, unit_cost,
          movement_type, reference_type, reference_id, notes
        )
        VALUES (
          v_item.product_id, CURRENT_DATE, v_net_qty, v_avg_cost,
          'adjustment_in', 'void', v_round.id,
          'Reversal - bill voided'
        );
      END IF;

      UPDATE round_items SET inventory_posted = false WHERE id = v_item.id;
    END LOOP;

    FOR v_entry IN
      SELECT je.id, je.source_type, je.source_id, je.description
      FROM journal_entries je
      WHERE je.source_id = v_round.id
        AND je.source_type IN ('round_sale', 'round_cogs')
        AND je.reversed_entry_id IS NULL
    LOOP
      INSERT INTO journal_entries (
        entry_date, source_type, source_id, description, reversed_entry_id
      )
      VALUES (
        CURRENT_DATE,
        v_entry.source_type || '_reversal',
        v_entry.source_id,
        v_entry.description || ' (VOID REVERSAL)',
        v_entry.id
      )
      RETURNING id INTO v_reversal_id;

      INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
      SELECT v_reversal_id, jl.account_id, jl.credit, jl.debit
      FROM journal_lines jl
      WHERE jl.journal_entry_id = v_entry.id;

      UPDATE journal_entries SET reversed_entry_id = v_reversal_id WHERE id = v_entry.id;
    END LOOP;
  END LOOP;
END;
$function$;

-- 4. reverse_round_item: partial-quantity aware inventory + COGS reversal
--    p_returned_quantity: how many units are being returned (1..original_quantity)
CREATE OR REPLACE FUNCTION public.reverse_round_item(
  p_round_item_id    UUID,
  p_returned_quantity INTEGER
)
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE
  v_item          RECORD;
  v_avg_cost      NUMERIC;
  v_item_cogs     NUMERIC;
  v_cogs_journal  UUID;
  v_inventory_acc UUID;
  v_purchases_acc UUID;
BEGIN
  -- Lock and fetch (must be posted, not a return line, not already fully exchanged)
  SELECT ri.id, ri.product_id, ri.quantity, ri.price, ri.round_id
  INTO v_item
  FROM round_items ri
  WHERE ri.id = p_round_item_id
    AND ri.inventory_posted = true
    AND COALESCE(ri.is_return, false) = false
    AND COALESCE(ri.is_exchanged, false) = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'round_item % not found, inventory not posted, is a return line, or already exchanged',
      p_round_item_id;
  END IF;

  IF p_returned_quantity <= 0 OR p_returned_quantity > v_item.quantity THEN
    RAISE EXCEPTION 'Invalid returned quantity % for round_item % (original qty: %)',
      p_returned_quantity, p_round_item_id, v_item.quantity;
  END IF;

  -- Get original sale cost
  SELECT COALESCE(ABS(unit_cost), 0) INTO v_avg_cost
  FROM inventory_movements
  WHERE reference_type = 'round'
    AND reference_id = v_item.round_id
    AND product_id = v_item.product_id
    AND quantity < 0
  ORDER BY created_at DESC
  LIMIT 1;
  v_avg_cost := COALESCE(v_avg_cost, 0);
  v_item_cogs := p_returned_quantity * v_avg_cost;

  -- 1. Restore inventory for exactly the returned quantity.
  --    reference_id = original round_item id so reverse_bill_sale can deduct this later.
  INSERT INTO inventory_movements (
    product_id, movement_date, quantity, unit_cost,
    movement_type, reference_type, reference_id, notes
  )
  VALUES (
    v_item.product_id, CURRENT_DATE, p_returned_quantity, v_avg_cost,
    'adjustment_in', 'exchange', v_item.id,
    'Reversal - item exchanged (qty: ' || p_returned_quantity || ')'
  );

  -- 2. Full return: mark original as exchanged + unpost.
  --    Partial return: leave original intact; reverse_bill_sale handles the net.
  IF p_returned_quantity = v_item.quantity THEN
    UPDATE round_items
    SET inventory_posted = false,
        is_exchanged     = true,
        exchanged_at     = NOW()
    WHERE id = p_round_item_id;
  END IF;

  -- 3. Partial COGS reversal (proportional to returned quantity)
  IF v_item_cogs > 0 THEN
    SELECT ii.inventory_account_id INTO v_inventory_acc
    FROM inventory_items ii
    WHERE ii.product_id = v_item.product_id
      AND ii.inventory_account_id IS NOT NULL
    LIMIT 1;

    SELECT id INTO v_purchases_acc
    FROM chart_of_accounts WHERE code = '5003' LIMIT 1;

    IF v_inventory_acc IS NOT NULL AND v_purchases_acc IS NOT NULL THEN
      INSERT INTO journal_entries (entry_date, source_type, source_id, description)
      VALUES (
        CURRENT_DATE, 'exchange_cogs_reversal', v_item.id,
        'COGS reversal - item exchanged (qty: ' || p_returned_quantity || ')'
      )
      RETURNING id INTO v_cogs_journal;

      INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
      VALUES
        (v_cogs_journal, v_inventory_acc, v_item_cogs, 0),
        (v_cogs_journal, v_purchases_acc, 0,           v_item_cogs);
    END IF;
  END IF;

END;
$function$;
