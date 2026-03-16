-- ============================================================================
-- BACKFILL: Post missing journal entries for historical inventory receipts
-- ----------------------------------------------------------------------------
-- Before 20260316_001, the post_inventory_purchase() trigger only created
-- inventory movements but never posted journal entries. This script
-- retroactively creates the DR Inventory / CR Accounts Payable entries
-- for every receipt line item that is missing a journal posting.
--
-- Safe to run multiple times — skips receipts that already have journals.
-- ============================================================================
DO $$
DECLARE v_item RECORD;
v_inv_acct UUID;
v_sup_acct UUID;
v_ap_acct UUID;
v_credit UUID;
v_journal_id UUID;
v_count INT := 0;
BEGIN -- Resolve the generic AP control account once
SELECT id INTO v_ap_acct
FROM chart_of_accounts
WHERE code = '2100';
IF v_ap_acct IS NULL THEN RAISE EXCEPTION 'Trade Payables account (2100) not found';
END IF;
FOR v_item IN
SELECT ri.id AS item_id,
    ri.receipt_id,
    ri.product_id,
    ri.line_total,
    r.purchase_date,
    r.invoice_number,
    r.supplier_id
FROM inventory_receipt_items ri
    JOIN inventory_receipts r ON r.id = ri.receipt_id
WHERE NOT EXISTS (
        -- Skip if a journal entry already exists for this receipt line
        -- The trigger posts one journal per line item, keyed on source_id = receipt_id
        -- and source_type = 'inventory_receipt'. We check that at least enough
        -- journal entries exist for this receipt.
        SELECT 1
        FROM journal_entries je
        WHERE je.source_type = 'inventory_receipt'
            AND je.source_id = ri.receipt_id
    )
    AND ri.line_total > 0
ORDER BY r.purchase_date,
    ri.receipt_id LOOP -- Get inventory GL account for this product
SELECT inventory_account_id INTO v_inv_acct
FROM inventory_items
WHERE product_id = v_item.product_id;
-- Get supplier-specific AP account
SELECT s.account_id INTO v_sup_acct
FROM suppliers s
WHERE s.id = v_item.supplier_id;
v_credit := COALESCE(v_sup_acct, v_ap_acct);
-- Skip if no inventory account configured for this product
IF v_inv_acct IS NULL THEN RAISE NOTICE 'Skipping receipt item % – no inventory account for product %',
v_item.item_id,
v_item.product_id;
CONTINUE;
END IF;
-- Create journal entry dated to the original purchase date
INSERT INTO journal_entries (
        entry_date,
        source_type,
        source_id,
        description
    )
VALUES (
        v_item.purchase_date,
        'inventory_receipt',
        v_item.receipt_id,
        'Inventory purchase (backfill) – ' || COALESCE(v_item.invoice_number, 'no ref')
    )
RETURNING id INTO v_journal_id;
-- Debit: Inventory asset account
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
VALUES (v_journal_id, v_inv_acct, v_item.line_total, 0);
-- Credit: Supplier AP / Trade Payables
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
VALUES (v_journal_id, v_credit, 0, v_item.line_total);
v_count := v_count + 1;
END LOOP;
RAISE NOTICE 'Backfill complete: % journal entries created',
v_count;
END;
$$ LANGUAGE plpgsql;