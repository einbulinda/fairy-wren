-- Migration: Fix trigger to use code '2100' instead of 'AP'
-- Date: 2026-03-10
-- Description: The initial migration deployed the trigger with the old 'AP' code.
--   This corrects it to use '2100' (Trade Payables).

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
-- Fall back to the Trade Payables control account
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
