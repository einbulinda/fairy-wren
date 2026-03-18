-- Fix: COGS journal entry was created per-item inside the loop using
-- (round_cogs, round_id) as source key. With multiple items per round,
-- the second insert hit uq_journal_source. Move COGS journal outside
-- the loop so one entry is posted per round with accumulated cost.

CREATE OR REPLACE FUNCTION public.post_round_sale(p_round_id uuid)
RETURNS void LANGUAGE plpgsql AS $function$
DECLARE
    v_item RECORD;
    v_avg_cost NUMERIC;
    v_total_cost NUMERIC;
    v_inventory_account UUID;
    v_purchases_account UUID;
    v_cogs_journal_id UUID;
    v_revenue_journal_id UUID;
    v_ar_account UUID;
    v_sales_account UUID;
    v_round_total NUMERIC := 0;
    v_total_cogs NUMERIC := 0;
    v_bill_id UUID;
    v_round_date DATE;
BEGIN
    /* Idempotency guard */
    IF EXISTS (
        SELECT 1 FROM journal_entries
        WHERE source_type = 'round_sale' AND source_id = p_round_id
    ) THEN RETURN;
    END IF;

    /* Get the bill_id and round date for this round */
    SELECT r.bill_id, r.created_at::date
    INTO v_bill_id, v_round_date
    FROM rounds r WHERE r.id = p_round_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Round not found: %', p_round_id;
    END IF;

    /* Resolve Inventory Purchases account (5003) once */
    SELECT id INTO v_purchases_account
    FROM chart_of_accounts WHERE code = '5003';

    IF v_purchases_account IS NULL THEN
        RAISE EXCEPTION 'Inventory Purchases account (5003) not found in chart_of_accounts';
    END IF;

    /* -------------------------------------------------------
       LOOP: Inventory deduction per item
       ------------------------------------------------------- */
    FOR v_item IN
        SELECT ri.id, ri.product_id, ri.quantity, ri.price
        FROM round_items ri
        WHERE ri.round_id = p_round_id
          AND ri.inventory_posted = false
    LOOP
        /* Accumulate round total for revenue entry */
        v_round_total := v_round_total + (v_item.quantity * v_item.price);

        /* Get weighted average cost */
        SELECT COALESCE(avg_unit_cost, 0) INTO v_avg_cost
        FROM inventory_avg_cost
        WHERE product_id = v_item.product_id;

        IF v_avg_cost IS NULL THEN
            v_avg_cost := 0;
        END IF;

        v_total_cost := v_item.quantity * v_avg_cost;
        v_total_cogs := v_total_cogs + v_total_cost;

        /* 1. Insert inventory movement (negative qty = sale) */
        INSERT INTO inventory_movements (
            product_id, movement_date, quantity, unit_cost,
            movement_type, reference_type, reference_id, notes
        ) VALUES (
            v_item.product_id, v_round_date, -v_item.quantity, v_avg_cost,
            'sale', 'round', p_round_id,
            'Sale via round submission'
        );

        /* 2. Mark item as posted */
        UPDATE round_items SET inventory_posted = true WHERE id = v_item.id;
    END LOOP;

    /* -------------------------------------------------------
       COGS journal: single entry for entire round
       DR Inventory Purchases (5003), CR Inventory asset
       ------------------------------------------------------- */
    IF v_total_cogs > 0 THEN
        SELECT ii.inventory_account_id
        INTO v_inventory_account
        FROM round_items ri
        JOIN inventory_items ii ON ii.product_id = ri.product_id
        WHERE ri.round_id = p_round_id
          AND ii.inventory_account_id IS NOT NULL
        LIMIT 1;

        IF v_inventory_account IS NOT NULL THEN
            INSERT INTO journal_entries (
                entry_date, source_type, source_id, description
            ) VALUES (
                v_round_date, 'round_cogs', p_round_id,
                'COGS on sale'
            ) RETURNING id INTO v_cogs_journal_id;

            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES
                (v_cogs_journal_id, v_purchases_account, v_total_cogs, 0),
                (v_cogs_journal_id, v_inventory_account, 0, v_total_cogs);
        END IF;
    END IF;

    /* -------------------------------------------------------
       Revenue recognition: Dr A/R Open Bills, Cr Sales
       ------------------------------------------------------- */
    IF v_round_total > 0 THEN
        SELECT id INTO v_ar_account
        FROM chart_of_accounts WHERE code = '1201';

        SELECT id INTO v_sales_account
        FROM chart_of_accounts WHERE code = '4000';

        IF v_ar_account IS NULL THEN
            RAISE EXCEPTION 'A/R Open Bills account (1201) not found in chart_of_accounts';
        END IF;

        IF v_sales_account IS NULL THEN
            RAISE EXCEPTION 'Sales Revenue account (4000) not found in chart_of_accounts';
        END IF;

        INSERT INTO journal_entries (
            entry_date, source_type, source_id, description
        ) VALUES (
            v_round_date, 'round_sale', p_round_id,
            'Revenue on round served'
        ) RETURNING id INTO v_revenue_journal_id;

        INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
        VALUES
            (v_revenue_journal_id, v_ar_account, v_round_total, 0),
            (v_revenue_journal_id, v_sales_account, 0, v_round_total);
    END IF;
END;
$function$;
