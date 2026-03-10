-- Migration: Supplier-specific AP child accounts under Trade Payables (2100)
-- Date: 2026-03-10
-- Description:
--   1. Adds unique constraint on chart_of_accounts.code
--   2. Creates the Trade Payables control account (code 2100, current_liability)
--   3. Adds account_id column to suppliers table
--   4. Creates a child GL account (210101, 210102, ...) for every existing supplier
--   5. Updates the inventory purchase trigger to post to the supplier child account

-- 1. Ensure unique constraint on account code (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chart_of_accounts_code_key'
    ) THEN
        ALTER TABLE chart_of_accounts ADD CONSTRAINT chart_of_accounts_code_key UNIQUE (code);
    END IF;
END;
$$;

-- 2. Create the Trade Payables parent control account
INSERT INTO chart_of_accounts (name, code, account_class, normal_balance, is_control_account, active)
VALUES ('Trade Payables', '2100', 'current_liability', 'credit', true, true)
ON CONFLICT ON CONSTRAINT chart_of_accounts_code_key DO NOTHING;

-- 3. Add the account_id column to suppliers
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.chart_of_accounts(id);

-- 4. Backfill: create a child account for each existing supplier
DO $$
DECLARE
    v_parent_id UUID;
    v_next_code INT := 1;
    v_supplier RECORD;
    v_new_account_id UUID;
BEGIN
    SELECT id INTO v_parent_id
    FROM chart_of_accounts
    WHERE code = '2100';

    IF v_parent_id IS NULL THEN
        RAISE EXCEPTION 'Trade Payables (2100) account not found';
    END IF;

    FOR v_supplier IN
        SELECT id, name FROM suppliers
        WHERE account_id IS NULL
        ORDER BY created_at
    LOOP
        -- Find the next available child code
        LOOP
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM chart_of_accounts
                WHERE code = '2100' || LPAD(v_next_code::text, 2, '0')
            );
            v_next_code := v_next_code + 1;
        END LOOP;

        INSERT INTO chart_of_accounts (name, code, account_class, normal_balance, parent_id, is_control_account, active)
        VALUES (
            v_supplier.name,
            '2100' || LPAD(v_next_code::text, 2, '0'),
            'current_liability',
            'credit',
            v_parent_id,
            false,
            true
        )
        RETURNING id INTO v_new_account_id;

        UPDATE suppliers
        SET account_id = v_new_account_id
        WHERE id = v_supplier.id;

        v_next_code := v_next_code + 1;
    END LOOP;
END;
$$;

-- 5. Update the inventory purchase journal trigger to use supplier-specific AP
CREATE OR REPLACE FUNCTION public.post_inventory_purchase_journal() RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE v_inventory_account UUID;
v_ap_account UUID;
v_supplier_account UUID;
v_journal_id UUID;
v_credit_account UUID;
BEGIN
SELECT inventory_account_id INTO v_inventory_account
FROM inventory_items
WHERE id = NEW.product_id;
-- Try to get the supplier-specific AP child account
SELECT s.account_id INTO v_supplier_account
FROM inventory_receipts r
JOIN suppliers s ON s.id = r.supplier_id
WHERE r.id = NEW.receipt_id;
-- Fall back to the Trade Payables control account if supplier has no dedicated account
SELECT id INTO v_ap_account
FROM chart_of_accounts
WHERE code = '2100';
v_credit_account := COALESCE(v_supplier_account, v_ap_account);
INSERT INTO journal_entries (
        entry_date,
        source_type,
        source_id,
        description
    )
VALUES (
        CURRENT_DATE,
        'inventory_receipt',
        NEW.receipt_id,
        'Inventory purchase'
    )
RETURNING id INTO v_journal_id;
INSERT INTO journal_lines (journal_entry_id, account_id, debit)
VALUES (
        v_journal_id,
        v_inventory_account,
        NEW.line_total
    );
INSERT INTO journal_lines (journal_entry_id, account_id, credit)
VALUES (v_journal_id, v_credit_account, NEW.line_total);
RETURN NEW;
END;
$function$;
