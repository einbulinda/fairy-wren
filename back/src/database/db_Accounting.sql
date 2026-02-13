/* ============================================================
 PHASE 0 — PREPARATION
 ============================================================ */
-- ⚠️ REQUIREMENTS:
-- 1. System in maintenance mode
-- 2. Full database backup completed
-- 3. No active POS sessions
BEGIN;
-- Disable high-risk triggers during migration
ALTER TABLE bills DISABLE TRIGGER IF EXISTS trg_bill_completed_inventory;
DROP TRIGGER IF EXISTS trg_validate_journal_balance ON journal_lines;
COMMIT;
/*
 == == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==
 PHASE 1 — CHART OF ACCOUNTS HARDENING 
 == == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==*/
BEGIN;
-- 1. Add structural accounting fields
ALTER TABLE chart_of_accounts
ADD COLUMN IF NOT EXISTS normal_balance TEXT CHECK (normal_balance IN ('debit', 'credit'));
ALTER TABLE chart_of_accounts
ADD COLUMN IF NOT EXISTS is_control_account BOOLEAN DEFAULT false;
ALTER TABLE chart_of_accounts
ADD COLUMN IF NOT EXISTS code VARCHAR(20);
-- 2. Backfill normal balance
UPDATE chart_of_accounts
SET normal_balance = 'debit'
WHERE account_class IN ('asset', 'expense', 'cost_of_sales')
    AND normal_balance IS NULL;
UPDATE chart_of_accounts
SET normal_balance = 'credit'
WHERE account_class IN ('liability', 'equity', 'income')
    AND normal_balance IS NULL;
COMMIT;
/*== == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==
 PHASE 2 — CONTROL ACCOUNTS (MUST EXIST) 
 == == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==*/
BEGIN;
-- Insert mandatory GL accounts if missing
INSERT INTO chart_of_accounts (
        name,
        account_class,
        normal_balance,
        code,
        is_control_account
    )
SELECT 'Cash on Hand',
    'asset',
    'debit',
    '1010',
    true
WHERE NOT EXISTS (
        SELECT 1
        FROM chart_of_accounts
        WHERE code = '1010'
    );
INSERT INTO chart_of_accounts (
        name,
        account_class,
        normal_balance,
        code,
        is_control_account
    )
SELECT 'Mpesa / Bank',
    'asset',
    'debit',
    '1020',
    true
WHERE NOT EXISTS (
        SELECT 1
        FROM chart_of_accounts
        WHERE code = '1020'
    );
INSERT INTO chart_of_accounts (
        name,
        account_class,
        normal_balance,
        code,
        is_control_account
    )
SELECT 'Accounts Receivable',
    'asset',
    'debit',
    '1100',
    true
WHERE NOT EXISTS (
        SELECT 1
        FROM chart_of_accounts
        WHERE code = '1100'
    );
INSERT INTO chart_of_accounts (
        name,
        account_class,
        normal_balance,
        code,
        is_control_account
    )
SELECT 'Sales Revenue',
    'income',
    'credit',
    '4000',
    true
WHERE NOT EXISTS (
        SELECT 1
        FROM chart_of_accounts
        WHERE code = '4000'
    );
INSERT INTO chart_of_accounts (
        name,
        account_class,
        normal_balance,
        code,
        is_control_account
    )
SELECT 'Tax Payable',
    'liability',
    'credit',
    '2100',
    true
WHERE NOT EXISTS (
        SELECT 1
        FROM chart_of_accounts
        WHERE code = '2100'
    );
COMMIT;
/*== == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==
 PHASE 3 — CASH ACCOUNT REFACTOR 
 == == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==*/
BEGIN;
CREATE TABLE IF NOT EXISTS cash_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('bank', 'petty_cash', 'mobile_money')),
    gl_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Insert default operational accounts
INSERT INTO cash_accounts (name, type, gl_account_id)
SELECT 'Petty Cash',
    'petty_cash',
    id
FROM chart_of_accounts
WHERE code = '1010'
    AND NOT EXISTS (
        SELECT 1
        FROM cash_accounts
        WHERE name = 'Petty Cash'
    );
INSERT INTO cash_accounts (name, type, gl_account_id)
SELECT 'Mpesa',
    'mobile_money',
    id
FROM chart_of_accounts
WHERE code = '1020'
    AND NOT EXISTS (
        SELECT 1
        FROM cash_accounts
        WHERE name = 'Mpesa'
    );
-- Add FK to payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS cash_account_id UUID REFERENCES cash_accounts(id);
COMMIT;
/*== == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==
 PHASE 4 — BILL TOTALS VIEW (AUTHORITATIVE) 
 == == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==*/
DROP VIEW IF EXISTS bill_totals;
CREATE VIEW bill_totals AS
SELECT b.id AS bill_id,
    COALESCE(SUM(ri.quantity * ri.price), 0) AS subtotal,
    0::numeric AS tax,
    COALESCE(SUM(ri.quantity * ri.price), 0) AS total,
    COALESCE(
        SUM(
            CASE
                WHEN p.status = 'confirmed' THEN p.amount
                ELSE 0
            END
        ),
        0
    ) AS amount_paid,
    COALESCE(SUM(ri.quantity * ri.price), 0) - COALESCE(
        SUM(
            CASE
                WHEN p.status = 'confirmed' THEN p.amount
                ELSE 0
            END
        ),
        0
    ) AS balance_due
FROM bills b
    LEFT JOIN rounds r ON r.bill_id = b.id
    LEFT JOIN round_items ri ON ri.round_id = r.id
    LEFT JOIN payments p ON p.bill_id = b.id
GROUP BY b.id;
/*== == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==
 PHASE 5 — JOURNAL SAFETY 
 == == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==*/
-- Unique protection against double posting
CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_source_live ON journal_entries (source_type, source_id)
WHERE source_type IN ('payment', 'sale', 'inventory_receipt');
/*== == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==
 PHASE 6 — POST PAYMENT JOURNAL FUNCTION 
 == == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==*/
CREATE OR REPLACE FUNCTION post_payment_journal(p_payment_id uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_payment payments %ROWTYPE;
v_totals RECORD;
v_cash_account uuid;
v_sales_account uuid;
v_journal_id uuid;
BEGIN -- Idempotency guard
IF EXISTS (
    SELECT 1
    FROM journal_entries
    WHERE source_type = 'payment'
        AND source_id = p_payment_id
) THEN RETURN;
END IF;
SELECT * INTO v_payment
FROM payments
WHERE id = p_payment_id;
SELECT * INTO v_totals
FROM bill_totals
WHERE bill_id = v_payment.bill_id;
IF v_totals.total <= 0 THEN RAISE EXCEPTION 'Zero-value payment not allowed';
END IF;
SELECT id INTO v_cash_account
FROM chart_of_accounts
WHERE code = CASE
        WHEN v_payment.payment_type = 'cash' THEN '1010'
        ELSE '1020'
    END;
SELECT id INTO v_sales_account
FROM chart_of_accounts
WHERE code = '4000';
INSERT INTO journal_entries(entry_date, source_type, source_id, description)
VALUES (
        CURRENT_DATE,
        'payment',
        p_payment_id,
        'POS payment'
    )
RETURNING id INTO v_journal_id;
INSERT INTO journal_lines(journal_entry_id, account_id, debit)
VALUES (v_journal_id, v_cash_account, v_totals.total);
INSERT INTO journal_lines(journal_entry_id, account_id, credit)
VALUES (v_journal_id, v_sales_account, v_totals.total);
END;
$$;
/*== == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==
 PHASE 7 — ENABLE DEFERRABLE BALANCE CONSTRAINT 
 == == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==*/
CREATE CONSTRAINT TRIGGER trg_validate_journal_balance
AFTER
INSERT
    OR
UPDATE ON journal_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_journal_balance();
/*== == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==
 PHASE 8 — INVENTORY STRUCTURE (SAFE ORDER) 
 == == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==*/
-- Add unit cost
ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 4) DEFAULT 0;
-- Index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
-- Average cost view
CREATE OR REPLACE VIEW inventory_avg_cost AS
SELECT product_id,
    SUM(quantity) AS qty_on_hand,
    CASE
        WHEN SUM(quantity) = 0 THEN 0
        ELSE SUM(quantity * unit_cost) / SUM(quantity)
    END AS avg_unit_cost
FROM inventory_movements
GROUP BY product_id;
/*== == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==
 PHASE 9 — RE - ENABLE INVENTORY BILL TRIGGER 
 == == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==*/
ALTER TABLE bills ENABLE TRIGGER trg_bill_completed_inventory;
/*== == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==
 PHASE 10 — SAFE CLEANUP 
 == == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==*/
-- Only drop payment_type AFTER verifying all payments have cash_account_id
-- (MANUAL CHECK REQUIRED)
-- SELECT COUNT(*) FROM payments WHERE cash_account_id IS NULL;
-- If zero:
-- ALTER TABLE payments DROP COLUMN payment_type CASCADE;
/*== == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==
 FINAL VALIDATION QUERIES 
 == == == == == == == == == == == == == == == == == == == == == == == == == == == == == ==*/
-- Check duplicate journals
SELECT source_type,
    source_id,
    COUNT(*)
FROM journal_entries
GROUP BY source_type,
    source_id
HAVING COUNT(*) > 1;
-- Check unbalanced entries
SELECT journal_entry_id
FROM journal_lines
GROUP BY journal_entry_id
HAVING SUM(debit) <> SUM(credit);
-- Check payments missing cash account
SELECT COUNT(*)
FROM payments
WHERE cash_account_id IS NULL;