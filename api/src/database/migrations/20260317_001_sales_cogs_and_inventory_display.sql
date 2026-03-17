-- ============================================================================
-- Sales COGS → Account 5003 "Inventory Purchases" + Opening/Closing Inventory
-- ----------------------------------------------------------------------------
-- 1. Creates account 5003 "Inventory Purchases" as child of 5000 (Cost of Sales)
-- 2. Updates post_round_sale to DR 5003 instead of inventory_items.cogs_account_id
-- 3. Updates rpc_income_statement to include computed Opening/Closing Inventory
-- Created: 17/03/2026 - einbulinda
-- ============================================================================

-- ========= 1. CREATE ACCOUNT 5003 =========
INSERT INTO chart_of_accounts (name, code, account_class, normal_balance, parent_id, is_control_account)
SELECT
    'Inventory Purchases',
    '5003',
    'cost_of_sales',
    'debit',
    (SELECT id FROM chart_of_accounts WHERE code = '5000'),
    false
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '5003');

-- ========= 2. UPDATE post_round_sale TO USE 5003 =========
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
       LOOP: Inventory deduction + COGS per item
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

        /* 1. Insert inventory movement (negative qty = sale) */
        INSERT INTO inventory_movements (
            product_id, movement_date, quantity, unit_cost,
            movement_type, reference_type, reference_id, notes
        ) VALUES (
            v_item.product_id, v_round_date, -v_item.quantity, v_avg_cost,
            'sale', 'round', p_round_id,
            'Sale via round submission'
        );

        /* 2. Post COGS journal: DR Inventory Purchases (5003), CR Inventory */
        SELECT inventory_account_id
        INTO v_inventory_account
        FROM inventory_items
        WHERE product_id = v_item.product_id;

        IF v_inventory_account IS NOT NULL
           AND v_total_cost > 0 THEN

            INSERT INTO journal_entries (
                entry_date, source_type, source_id, description
            ) VALUES (
                v_round_date, 'round_cogs', p_round_id,
                'COGS on sale'
            ) RETURNING id INTO v_cogs_journal_id;

            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES
                (v_cogs_journal_id, v_purchases_account, v_total_cost, 0),
                (v_cogs_journal_id, v_inventory_account, 0, v_total_cost);
        END IF;

        /* 3. Mark item as posted */
        UPDATE round_items SET inventory_posted = true WHERE id = v_item.id;
    END LOOP;

    /* -------------------------------------------------------
       Revenue recognition: Dr A/R Open Bills, Cr Sales
       Use the round's date (when items were served)
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

-- ========= 3. DEACTIVATE OLD MANUAL 5002 (replaced by auto-computed row) =========
UPDATE chart_of_accounts SET active = false WHERE code = '5002';

-- ========= 4. UPDATE rpc_income_statement WITH COMPUTED INVENTORY ROWS =========
-- Must DROP first because return type changes (added is_computed column)
DROP FUNCTION IF EXISTS public.rpc_income_statement(date, date);
CREATE OR REPLACE FUNCTION public.rpc_income_statement(p_start_date date, p_end_date date)
RETURNS TABLE (
    account_id uuid,
    account_code varchar,
    account_name varchar,
    account_class varchar,
    parent_id uuid,
    normal_balance varchar,
    is_control_account boolean,
    balance numeric,
    is_computed boolean
) LANGUAGE plpgsql STABLE AS $function$
DECLARE
    v_cos_parent_id UUID;
    v_opening_inventory NUMERIC;
    v_closing_inventory NUMERIC;
    v_5002_balance NUMERIC;
BEGIN
    /* Resolve the Cost of Sales parent account */
    SELECT id INTO v_cos_parent_id
    FROM chart_of_accounts WHERE code = '5000';

    /* Get cumulative balance of manual Opening Inventory account (5002).
       This was posted as DR 5002 / CR Bank for historical opening balances
       and never hit the inventory asset accounts (4001-4014).
       We fold it into the computed Opening/Closing Inventory values. */
    SELECT COALESCE(SUM(jl.debit - jl.credit), 0)
    INTO v_5002_balance
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    WHERE jl.account_id = (SELECT id FROM chart_of_accounts WHERE code = '5002');

    /* Compute Opening Inventory: inventory asset GL balances before start date
       + the 5002 manual opening balance */
    SELECT COALESCE(SUM(jl.debit - jl.credit), 0) + v_5002_balance
    INTO v_opening_inventory
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    WHERE jl.account_id IN (SELECT DISTINCT inventory_account_id FROM inventory_items)
      AND je.entry_date < p_start_date;

    /* Compute Closing Inventory: inventory asset GL balances through end date
       + the 5002 manual opening balance */
    SELECT COALESCE(SUM(jl.debit - jl.credit), 0) + v_5002_balance
    INTO v_closing_inventory
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    WHERE jl.account_id IN (SELECT DISTINCT inventory_account_id FROM inventory_items)
      AND je.entry_date <= p_end_date;

    RETURN QUERY

    /* ---- Regular income/expense accounts ---- */
    SELECT
        coa.id AS account_id,
        coa.code::varchar AS account_code,
        coa.name::varchar AS account_name,
        coa.account_class::varchar,
        coa.parent_id,
        coa.normal_balance::varchar,
        coa.is_control_account,
        CASE
            WHEN coa.normal_balance = 'credit'
                THEN COALESCE(SUM(jl.credit - jl.debit), 0)
            ELSE COALESCE(SUM(jl.debit - jl.credit), 0)
        END AS balance,
        false AS is_computed
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
        AND je.entry_date >= p_start_date
        AND je.entry_date <= p_end_date
    WHERE coa.account_class IN (
            'income', 'cost_of_sales', 'expense',
            'finance_cost', 'admin_cost', 'operating_cost'
        )
        AND coa.active = true
    GROUP BY coa.id, coa.code, coa.name, coa.account_class,
             coa.parent_id, coa.normal_balance, coa.is_control_account
    HAVING COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) != 0
        OR coa.parent_id IS NULL
        OR coa.is_control_account = true

    UNION ALL

    /* ---- Opening Inventory (computed, sorts before 5003) ---- */
    SELECT
        '00000000-0000-0000-0000-000000000001'::uuid,
        '5001'::varchar,
        'Opening Inventory'::varchar,
        'cost_of_sales'::varchar,
        v_cos_parent_id,
        'debit'::varchar,
        false,
        v_opening_inventory,
        true

    UNION ALL

    /* ---- Closing Inventory (computed, sorts after 5003) ---- */
    SELECT
        '00000000-0000-0000-0000-000000000002'::uuid,
        '5099'::varchar,
        'Closing Inventory'::varchar,
        'cost_of_sales'::varchar,
        v_cos_parent_id,
        'credit'::varchar,
        false,
        v_closing_inventory,
        true

    ORDER BY account_code;
END;
$function$;
