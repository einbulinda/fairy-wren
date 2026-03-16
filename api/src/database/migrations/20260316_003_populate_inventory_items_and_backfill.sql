-- ============================================================================
-- POPULATE inventory_items for all products + backfill missing journal entries
-- ----------------------------------------------------------------------------
-- inventory_items was mostly empty, so the purchase journal backfill had no
-- GL accounts to post against. This migration:
--   1. Maps each category to its inventory GL account (4002-4014)
--   2. Creates inventory_items for every product missing one
--   3. Re-runs the AP journal backfill for historical receipts
-- ============================================================================

-- ========= 1. POPULATE INVENTORY_ITEMS =========
DO $$
DECLARE
    v_cogs_acct UUID;
    v_product   RECORD;
    v_inv_acct  UUID;
    v_count     INT := 0;
BEGIN
    -- COGS account for all products
    SELECT id INTO v_cogs_acct
    FROM chart_of_accounts WHERE code = '5000';

    IF v_cogs_acct IS NULL THEN
        RAISE EXCEPTION 'Cost of Sales account (5000) not found';
    END IF;

    FOR v_product IN
        SELECT p.id AS product_id, p.name AS product_name, c.name AS category_name
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE NOT EXISTS (
            SELECT 1 FROM inventory_items ii
            WHERE ii.product_id = p.id
        )
    LOOP
        -- Map category name to inventory account code
        SELECT id INTO v_inv_acct
        FROM chart_of_accounts
        WHERE code = CASE v_product.category_name
            WHEN 'Beers'       THEN '4002'
            WHEN 'Brandy'      THEN '4003'
            WHEN 'Cider'       THEN '4004'
            WHEN 'Cognac'      THEN '4005'
            WHEN 'Gin'         THEN '4006'
            WHEN 'Liqueur'     THEN '4007'
            WHEN 'Rum'         THEN '4008'
            WHEN 'Soft Drinks' THEN '4009'
            WHEN 'Spirit'      THEN '4010'
            WHEN 'Tequila'     THEN '4011'
            WHEN 'Vodka'       THEN '4012'
            WHEN 'Whisky'      THEN '4013'
            WHEN 'Wine'        THEN '4014'
            ELSE '4001'  -- fallback to generic Inventory
        END;

        IF v_inv_acct IS NULL THEN
            RAISE NOTICE 'No inventory account for category %, skipping product %',
                v_product.category_name, v_product.product_id;
            CONTINUE;
        END IF;

        INSERT INTO inventory_items (product_id, inventory_account_id, cogs_account_id, name, cost_price)
        VALUES (v_product.product_id, v_inv_acct, v_cogs_acct, v_product.product_name, 0);

        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Inventory items created: %', v_count;
END;
$$;

-- ========= 2. BACKFILL MISSING PURCHASE JOURNAL ENTRIES =========
-- One journal entry per receipt. Debit lines grouped by inventory account,
-- single credit line to the supplier AP account for the receipt total.
DO $$
DECLARE
    v_receipt    RECORD;
    v_line       RECORD;
    v_sup_acct   UUID;
    v_ap_acct    UUID;
    v_credit     UUID;
    v_journal_id UUID;
    v_total      NUMERIC;
    v_count      INT := 0;
BEGIN
    SELECT id INTO v_ap_acct
    FROM chart_of_accounts WHERE code = '2100';

    IF v_ap_acct IS NULL THEN
        RAISE EXCEPTION 'Trade Payables account (2100) not found';
    END IF;

    -- Loop over receipts that have no journal entry yet
    -- Only include receipts whose items can be matched to inventory_items
    FOR v_receipt IN
        SELECT r.id, r.purchase_date, r.invoice_number, r.supplier_id,
               sum(ri.line_total) AS matchable_total
        FROM inventory_receipts r
        JOIN inventory_receipt_items ri ON ri.receipt_id = r.id
        JOIN inventory_items ii ON ii.product_id = ri.product_id
        WHERE NOT EXISTS (
            SELECT 1 FROM journal_entries je
            WHERE je.source_type = 'inventory_receipt'
              AND je.source_id = r.id
        )
        AND ri.line_total > 0
        GROUP BY r.id, r.purchase_date, r.invoice_number, r.supplier_id
        HAVING sum(ri.line_total) > 0
        ORDER BY r.purchase_date
    LOOP
        -- Resolve supplier AP account
        SELECT s.account_id INTO v_sup_acct
        FROM suppliers s WHERE s.id = v_receipt.supplier_id;

        v_credit := COALESCE(v_sup_acct, v_ap_acct);

        -- Create one journal entry for this receipt
        INSERT INTO journal_entries (
            entry_date, source_type, source_id, description
        ) VALUES (
            v_receipt.purchase_date,
            'inventory_receipt',
            v_receipt.id,
            'Inventory purchase (backfill) - ' || COALESCE(v_receipt.invoice_number, 'no ref')
        ) RETURNING id INTO v_journal_id;

        -- Debit lines: one per inventory account (grouped)
        v_total := 0;
        FOR v_line IN
            SELECT ii.inventory_account_id, sum(ri.line_total) AS subtotal
            FROM inventory_receipt_items ri
            JOIN inventory_items ii ON ii.product_id = ri.product_id
            WHERE ri.receipt_id = v_receipt.id
              AND ri.line_total > 0
            GROUP BY ii.inventory_account_id
        LOOP
            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES (v_journal_id, v_line.inventory_account_id, v_line.subtotal, 0);

            v_total := v_total + v_line.subtotal;
        END LOOP;

        -- Credit line: AP for the total
        INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
        VALUES (v_journal_id, v_credit, 0, v_total);

        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Backfill complete: % journal entries created', v_count;
END;
$$;
