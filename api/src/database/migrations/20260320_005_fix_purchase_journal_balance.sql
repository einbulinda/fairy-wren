/*
  Fix: post_inventory_purchase() journal lines inserted in single statement
  -------------------------------------------------------------------------
  The trigger inserted debit and credit journal lines as two separate INSERT
  statements. A non-deferred balance-check trigger on journal_lines would fire
  after the first (debit-only) insert and raise "Journal entry is not balanced".

  Combining both lines into a single INSERT ensures both rows exist before any
  row-level AFTER trigger fires.
*/

CREATE OR REPLACE FUNCTION public.post_inventory_purchase() RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE v_inventory_account UUID;
v_ap_account UUID;
v_supplier_account UUID;
v_credit_account UUID;
v_journal_id UUID;
BEGIN -- ========= 1. INVENTORY MOVEMENT =========
INSERT INTO inventory_movements (
        product_id,
        movement_date,
        quantity,
        unit_cost,
        movement_type,
        reference_type,
        reference_id,
        notes
    )
VALUES (
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
AND NEW.line_total > 0 THEN -- Reuse existing journal entry for this receipt, or create a new one
SELECT id INTO v_journal_id
FROM journal_entries
WHERE source_type = 'inventory_receipt'
    AND source_id = NEW.receipt_id;
IF v_journal_id IS NULL THEN
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
        'Inventory purchase – ' || COALESCE(
            (
                SELECT invoice_number
                FROM inventory_receipts
                WHERE id = NEW.receipt_id
            ),
            'no ref'
        )
    )
RETURNING id INTO v_journal_id;
END IF;
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
VALUES (
        v_journal_id,
        v_inventory_account,
        NEW.line_total,
        0
    ),
    (
        v_journal_id,
        v_credit_account,
        0,
        NEW.line_total
    );
END IF;
RETURN NEW;
END;
$function$;
