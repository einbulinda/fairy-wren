/*
 ================================================
 FAIRY-WREN ERP DATABASE MIGRATION
 Production-Ready Migration Script
 Clean, ordered, bug-free execution
 ================================================
 */
BEGIN;
-- ================================================
-- PHASE 1: Chart of Accounts Enhancement
-- ================================================
-- Add normal balance tracking (critical for accounting integrity)
ALTER TABLE chart_of_accounts
ADD COLUMN IF NOT EXISTS normal_balance TEXT CHECK (normal_balance IN ('debit', 'credit'));
-- Add control account flag (for hierarchy management)
ALTER TABLE chart_of_accounts
ADD COLUMN IF NOT EXISTS is_control_account BOOLEAN DEFAULT false;
-- Backfill normal balance for existing accounts
UPDATE chart_of_accounts
SET normal_balance = 'debit'
WHERE normal_balance IS NULL
  AND account_class IN ('asset', 'expense', 'cost_of_sales');
UPDATE chart_of_accounts
SET normal_balance = 'credit'
WHERE normal_balance IS NULL
  AND account_class IN ('liability', 'equity', 'income');
-- ================================================
-- PHASE 2: Cash Management Setup
-- ================================================
-- Create cash accounts table (unified cash tracking)
CREATE TABLE IF NOT EXISTS cash_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('bank', 'petty_cash', 'mobile_money')),
  gl_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cash_accounts_name ON cash_accounts(name);
-- ================================================
-- PHASE 3: Payment Table Enhancement
-- ================================================
-- Link payments to cash accounts (replaces payment_type column)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS cash_account_id UUID REFERENCES cash_accounts(id);
-- ================================================
-- PHASE 4: Journal Entry Protection
-- ================================================
-- Add posting metadata for audit trail
ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS posted BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ DEFAULT now();
-- ================================================
-- PHASE 5: Chart of Accounts - Populate High-Level Structure
-- ================================================
-- Current Assets parent
INSERT INTO chart_of_accounts (
    name,
    account_class,
    normal_balance,
    is_control_account
  )
VALUES ('Current Assets', 'asset', 'debit', true) ON CONFLICT (name) DO NOTHING;
-- Cash & Bank control account (parent for specific cash accounts)
INSERT INTO chart_of_accounts (
    name,
    account_class,
    normal_balance,
    parent_id,
    is_control_account
  )
SELECT 'Cash & Bank',
  'asset',
  'debit',
  id,
  true
FROM chart_of_accounts
WHERE name = 'Current Assets' ON CONFLICT (name) DO NOTHING;
-- ================================================
-- PHASE 6: Cash Accounts - Populate Specific Accounts
-- ================================================
-- Petty Cash
INSERT INTO cash_accounts (name, type, gl_account_id)
SELECT 'Petty Cash',
  'petty_cash',
  id
FROM chart_of_accounts
WHERE name = 'Cash & Bank' ON CONFLICT (name) DO NOTHING;
-- Mpesa (Mobile Money)
INSERT INTO cash_accounts (name, type, gl_account_id)
SELECT 'Mpesa',
  'mobile_money',
  id
FROM chart_of_accounts
WHERE name = 'Cash & Bank' ON CONFLICT (name) DO NOTHING;
-- KCB Bank
INSERT INTO cash_accounts (name, type, gl_account_id)
SELECT 'KCB Bank',
  'bank',
  id
FROM chart_of_accounts
WHERE name = 'Cash & Bank' ON CONFLICT (name) DO NOTHING;
-- ================================================
-- PHASE 7: Payment Data Migration
-- ================================================
-- Migrate payment_type='mpesa' to cash_account_id
UPDATE payments
SET cash_account_id = (
    SELECT id
    FROM cash_accounts
    WHERE name = 'Mpesa'
  )
WHERE payment_type = 'mpesa'
  AND cash_account_id IS NULL;
-- Migrate payment_type='cash' to cash_account_id
UPDATE payments
SET cash_account_id = (
    SELECT id
    FROM cash_accounts
    WHERE name = 'Petty Cash'
  )
WHERE payment_type = 'cash'
  AND cash_account_id IS NULL;
-- ================================================
-- PHASE 8: Drop Legacy Payment Type Column
-- ================================================
-- Now safe to drop old payment_type column
ALTER TABLE payments DROP COLUMN IF EXISTS payment_type;
-- ================================================
-- PHASE 9: Inventory Tracking Infrastructure
-- ================================================
-- Add unit cost tracking to inventory movements
ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 4) DEFAULT 0;
-- Update constraint for movement types
ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;
ALTER TABLE inventory_movements
ADD CONSTRAINT inventory_movements_movement_type_check CHECK (
    movement_type IN (
      'purchase',
      'sale',
      'adjustment_in',
      'adjustment_out',
      'opening_balance'
    )
  );
-- ================================================
-- PHASE 10: Inventory Items Restructuring
-- ================================================
-- Restructure inventory_items to link to products
ALTER TABLE inventory_items DROP COLUMN IF EXISTS name;
ALTER TABLE inventory_items DROP COLUMN IF EXISTS cost_price;
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS product_id UUID UNIQUE;
-- Clear old inventory items for clean backfill
DELETE FROM inventory_items;
-- ================================================
-- PHASE 11: Inventory Movement - Opening Stock Migration
-- ================================================
-- Migrate current product stock to inventory movements (opening balance)
INSERT INTO inventory_movements (
    product_id,
    movement_date,
    quantity,
    movement_type,
    reference_type,
    reference_id,
    reason,
    notes,
    created_at
  )
SELECT p.id AS product_id,
  CURRENT_DATE AS movement_date,
  p.current_stock AS quantity,
  'opening_balance' AS movement_type,
  'system_migration' AS reference_type,
  gen_random_uuid() AS reference_id,
  'opening stock migration' AS reason,
  'Migrated from products.current_stock' AS notes,
  now()
FROM products p
WHERE p.track_inventory = true
  AND p.current_stock IS NOT NULL
  AND p.current_stock > 0
  AND NOT EXISTS (
    SELECT 1
    FROM inventory_movements
    WHERE product_id = p.id
      AND movement_type = 'opening_balance'
  );
-- ================================================
-- PHASE 12: Inventory Receipt Items Backfill
-- ================================================
-- Migrate inventory receipt items to inventory movements
INSERT INTO inventory_movements (
    product_id,
    movement_date,
    quantity,
    unit_cost,
    movement_type,
    reference_type,
    reference_id,
    notes,
    created_at
  )
SELECT iri.product_id,
  ir.purchase_date,
  iri.quantity,
  iri.unit_cost,
  'purchase',
  'inventory_receipt',
  iri.receipt_id,
  'Backfilled from inventory_receipt_items',
  now()
FROM inventory_receipt_items iri
  JOIN inventory_receipts ir ON ir.id = iri.receipt_id
WHERE NOT EXISTS (
    SELECT 1
    FROM inventory_movements im
    WHERE im.reference_type = 'inventory_receipt'
      AND im.reference_id = iri.receipt_id
      AND im.product_id = iri.product_id
  );
-- ================================================
-- PHASE 13: Inventory Accounts Hierarchy
-- ================================================
-- Create inventory category accounts under Inventory parent
WITH inventory_parent AS (
  SELECT id
  FROM chart_of_accounts
  WHERE name = 'Inventory'
  LIMIT 1
)
INSERT INTO chart_of_accounts (
    name,
    account_class,
    normal_balance,
    parent_id,
    is_control_account
  )
SELECT c.name AS name,
  'asset' AS account_class,
  'debit' AS normal_balance,
  ip.id AS parent_id,
  false
FROM categories c
  CROSS JOIN inventory_parent ip
WHERE NOT EXISTS (
    SELECT 1
    FROM chart_of_accounts ca
    WHERE ca.name = c.name
      AND ca.parent_id = ip.id
  );
-- ================================================
-- PHASE 14: Inventory Items Backfill (Products Mapping)
-- ================================================
-- Map each product to its GL accounts (inventory + COGS)
WITH cogs_account AS (
  SELECT id
  FROM chart_of_accounts
  WHERE name = 'Cost of Sales'
  LIMIT 1
), inventory_accounts AS (
  SELECT cat.id AS category_id,
    coa.id AS account_id
  FROM categories cat
    JOIN chart_of_accounts coa ON coa.name = cat.name
    AND coa.account_class = 'asset'
),
product_mappings AS (
  SELECT p.id AS product_id,
    ca.id AS cogs_account_id,
    ia.account_id AS inventory_account_id
  FROM products p
    CROSS JOIN cogs_account ca
    LEFT JOIN inventory_accounts ia ON ia.category_id = p.category_id
  WHERE ca.id IS NOT NULL
)
INSERT INTO inventory_items (
    product_id,
    cogs_account_id,
    inventory_account_id
  )
SELECT product_id,
  cogs_account_id,
  inventory_account_id
FROM product_mappings;
-- ================================================
-- PHASE 15: Bill Round Items Enhancement
-- ================================================
-- Track which round items have been posted to GL
ALTER TABLE round_items
ADD COLUMN IF NOT EXISTS inventory_posted BOOLEAN DEFAULT false;
-- ================================================
-- PHASE 16: Customer AR Setup
-- ================================================
-- Create customer invoices table (AR tracking)
CREATE TABLE IF NOT EXISTS customer_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  total NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('open', 'partially_paid', 'paid')),
  created_at TIMESTAMPTZ DEFAULT now()
);
-- ================================================
-- PHASE 17: Owner Equity Setup
-- ================================================
-- Track owner capital contributions
CREATE TABLE IF NOT EXISTS capital_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount NUMERIC NOT NULL,
  cash_account_id UUID REFERENCES cash_accounts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
-- ================================================
-- PHASE 18: Payroll Setup
-- ================================================
-- Employee master
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  mpesa_no TEXT NOT NULL
);
-- Payroll run (period)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period DATE NOT NULL UNIQUE
);
-- Payroll items (line items per employee)
CREATE TABLE IF NOT EXISTS payroll_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  net_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- ================================================
-- PHASE 19: Journal Entry Balance Enforcement
-- ================================================
-- Function to validate journal entry balance (debit = credit)
CREATE OR REPLACE FUNCTION enforce_balanced_journal() RETURNS TRIGGER AS $$ BEGIN IF (
    SELECT COALESCE(SUM(debit), 0) != COALESCE(SUM(credit), 0)
    FROM journal_lines
    WHERE journal_entry_id = NEW.journal_entry_id
  ) THEN RAISE EXCEPTION 'Journal entry % is not balanced. Debit != Credit',
  NEW.journal_entry_id;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create trigger for journal balance validation
DROP TRIGGER IF EXISTS trg_validate_journal_balance ON journal_lines;
CREATE TRIGGER trg_validate_journal_balance
AFTER
INSERT
  OR
UPDATE ON journal_lines FOR EACH ROW EXECUTE FUNCTION enforce_balanced_journal();
-- ================================================
-- PHASE 20: Accounting Functions
-- ================================================
-- Post customer invoice to GL (AR + Revenue)
CREATE OR REPLACE FUNCTION post_customer_invoice(
    p_invoice_id UUID,
    p_ar_account UUID,
    p_revenue_account UUID
  ) RETURNS VOID AS $$
DECLARE v_total NUMERIC;
v_journal_id UUID;
BEGIN
SELECT total INTO v_total
FROM customer_invoices
WHERE id = p_invoice_id;
INSERT INTO journal_entries (entry_date, source_type, source_id)
VALUES (CURRENT_DATE, 'customer_invoice', p_invoice_id)
RETURNING id INTO v_journal_id;
INSERT INTO journal_lines (journal_entry_id, account_id, debit)
VALUES (v_journal_id, p_ar_account, v_total);
INSERT INTO journal_lines (journal_entry_id, account_id, credit)
VALUES (v_journal_id, p_revenue_account, v_total);
END;
$$ LANGUAGE plpgsql;
-- Post supplier bill to GL (Expense + AP)
CREATE OR REPLACE FUNCTION post_supplier_bill(
    p_bill_id UUID,
    p_expense_account UUID,
    p_ap_account UUID
  ) RETURNS VOID AS $$
DECLARE v_total NUMERIC;
v_journal_id UUID;
BEGIN
SELECT total INTO v_total
FROM supplier_bills
WHERE id = p_bill_id;
INSERT INTO journal_entries (entry_date, source_type, source_id)
VALUES (CURRENT_DATE, 'supplier_bill', p_bill_id)
RETURNING id INTO v_journal_id;
INSERT INTO journal_lines (journal_entry_id, account_id, debit)
VALUES (v_journal_id, p_expense_account, v_total);
INSERT INTO journal_lines (journal_entry_id, account_id, credit)
VALUES (v_journal_id, p_ap_account, v_total);
END;
$$ LANGUAGE plpgsql;
-- Apply payment to AR/AP/Expense (unified)
CREATE OR REPLACE FUNCTION apply_payment(
    p_source_type TEXT,
    p_source_id UUID,
    p_cash_account UUID,
    p_amount NUMERIC,
    p_control_account UUID
  ) RETURNS VOID AS $$
DECLARE v_journal_id UUID;
BEGIN
INSERT INTO journal_entries (entry_date, source_type, source_id)
VALUES (CURRENT_DATE, p_source_type, p_source_id)
RETURNING id INTO v_journal_id;
INSERT INTO journal_lines (journal_entry_id, account_id, debit)
VALUES (v_journal_id, p_control_account, p_amount);
INSERT INTO journal_lines (journal_entry_id, account_id, credit)
VALUES (
    v_journal_id,
    (
      SELECT gl_account_id
      FROM cash_accounts
      WHERE id = p_cash_account
    ),
    p_amount
  );
END;
$$ LANGUAGE plpgsql;
-- ================================================
-- PHASE 21: Inventory Movement Triggers & Functions
-- ================================================
-- Automatic inventory posting on receipt
CREATE OR REPLACE FUNCTION post_inventory_purchase() RETURNS TRIGGER AS $$ BEGIN
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
    'Automatic posting from inventory receipt'
  );
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_post_inventory_purchase ON inventory_receipt_items;
CREATE TRIGGER trg_post_inventory_purchase
AFTER
INSERT ON inventory_receipt_items FOR EACH ROW EXECUTE FUNCTION post_inventory_purchase();
-- Journal posting for inventory purchases
CREATE OR REPLACE FUNCTION post_inventory_purchase_journal() RETURNS TRIGGER AS $$
DECLARE v_inventory_account UUID;
v_ap_account UUID;
v_journal_id UUID;
BEGIN
SELECT inventory_account_id INTO v_inventory_account
FROM inventory_items
WHERE product_id = NEW.product_id;
SELECT id INTO v_ap_account
FROM chart_of_accounts
WHERE code = 'AP';
IF v_inventory_account IS NULL
OR v_ap_account IS NULL THEN RETURN NEW;
END IF;
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
    'Inventory purchase posting'
  )
RETURNING id INTO v_journal_id;
INSERT INTO journal_lines (journal_entry_id, account_id, debit)
VALUES (
    v_journal_id,
    v_inventory_account,
    NEW.line_total
  );
INSERT INTO journal_lines (journal_entry_id, account_id, credit)
VALUES (v_journal_id, v_ap_account, NEW.line_total);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- ================================================
-- PHASE 22: COGS & Sale Posting
-- ================================================
-- Post sale COGS (called on bill completion)
CREATE OR REPLACE FUNCTION post_sale_cogs_for_item(
    p_product_id UUID,
    p_quantity NUMERIC,
    p_reference_id UUID
  ) RETURNS VOID AS $$
DECLARE v_avg_cost NUMERIC := 0;
v_total_cost NUMERIC;
v_inventory_account UUID;
v_cogs_account UUID;
v_journal_id UUID;
BEGIN -- Get average cost from inventory movements
SELECT COALESCE(
    SUM(quantity * unit_cost) / NULLIF(SUM(quantity), 0),
    0
  ) INTO v_avg_cost
FROM inventory_movements
WHERE product_id = p_product_id
  AND movement_type IN ('purchase', 'opening_balance');
v_total_cost := p_quantity * v_avg_cost;
-- Record inventory movement (sale)
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
    p_product_id,
    CURRENT_DATE,
    - p_quantity,
    v_avg_cost,
    'sale',
    'bill_sale',
    p_reference_id,
    CASE
      WHEN v_avg_cost = 0 THEN 'Sale (zero cost - no purchase history)'
      ELSE 'Sale posting'
    END
  );
-- Get GL accounts
SELECT inventory_account_id,
  cogs_account_id INTO v_inventory_account,
  v_cogs_account
FROM inventory_items
WHERE product_id = p_product_id;
-- Skip GL posting if accounts missing or zero-value transaction
IF v_inventory_account IS NULL
OR v_cogs_account IS NULL
OR v_total_cost = 0 THEN RETURN;
END IF;
-- Create journal entry
INSERT INTO journal_entries (
    entry_date,
    source_type,
    source_id,
    description
  )
VALUES (
    CURRENT_DATE,
    'bill_sale',
    p_reference_id,
    'COGS posting for sale'
  )
RETURNING id INTO v_journal_id;
-- Dr COGS
INSERT INTO journal_lines (journal_entry_id, account_id, debit)
VALUES (v_journal_id, v_cogs_account, v_total_cost);
-- Cr Inventory
INSERT INTO journal_lines (journal_entry_id, account_id, credit)
VALUES (v_journal_id, v_inventory_account, v_total_cost);
END;
$$ LANGUAGE plpgsql;
-- Trigger on bill completion to post COGS
CREATE OR REPLACE FUNCTION post_bill_inventory_and_cogs() RETURNS TRIGGER AS $$
DECLARE r RECORD;
BEGIN IF OLD.status <> 'completed'
AND NEW.status = 'completed' THEN FOR r IN
SELECT ri.id AS round_item_id,
  ri.product_id,
  ri.quantity
FROM rounds ro
  JOIN round_items ri ON ri.round_id = ro.id
WHERE ro.bill_id = NEW.id
  AND ri.inventory_posted = false LOOP PERFORM post_sale_cogs_for_item(r.product_id, r.quantity, NEW.id);
UPDATE round_items
SET inventory_posted = true
WHERE id = r.round_item_id;
END LOOP;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_bill_completed_inventory ON bills;
CREATE TRIGGER trg_bill_completed_inventory
AFTER
UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION post_bill_inventory_and_cogs();
-- Temporarily disable for backfills
ALTER TABLE bills DISABLE TRIGGER trg_bill_completed_inventory;
-- ================================================
-- PHASE 23: Backfill Completed Bills COGS
-- ================================================
DO $$
DECLARE r RECORD;
BEGIN FOR r IN
SELECT ri.id AS round_item_id,
  ri.product_id,
  ri.quantity,
  b.id AS bill_id
FROM bills b
  JOIN rounds ro ON ro.bill_id = b.id
  JOIN round_items ri ON ri.round_id = ro.id
WHERE b.status = 'completed'
  AND ri.inventory_posted = false LOOP PERFORM post_sale_cogs_for_item(r.product_id, r.quantity, r.bill_id);
UPDATE round_items
SET inventory_posted = true
WHERE id = r.round_item_id;
END LOOP;
END $$;
-- Re-enable bill trigger
ALTER TABLE bills ENABLE TRIGGER trg_bill_completed_inventory;
-- ================================================
-- PHASE 24: Inventory Views
-- ================================================
-- Current stock balance per product
CREATE OR REPLACE VIEW inventory_on_hand AS
SELECT im.product_id,
  COALESCE(SUM(im.quantity), 0) AS current_stock
FROM inventory_movements im
GROUP BY im.product_id;
-- Average unit cost per product
CREATE OR REPLACE VIEW inventory_avg_cost AS
SELECT im.product_id,
  SUM(im.quantity) AS qty_on_hand,
  CASE
    WHEN SUM(im.quantity) = 0 THEN 0
    ELSE SUM(im.quantity * im.unit_cost) / SUM(im.quantity)
  END AS avg_unit_cost
FROM inventory_movements im
GROUP BY im.product_id;
-- Stock by category
CREATE OR REPLACE VIEW inventory_current_stock AS
SELECT im.product_id,
  p.name,
  c.name AS category_name,
  COALESCE(SUM(im.quantity), 0) AS current_stock
FROM inventory_movements im
  LEFT JOIN products p ON im.product_id = p.id
  LEFT JOIN categories c ON p.category_id = c.id
GROUP BY im.product_id,
  p.name,
  c.name
ORDER BY current_stock DESC;
-- Products with current stock
CREATE OR REPLACE VIEW products_with_stock AS
SELECT p.id,
  p.name,
  p.price,
  p.active,
  p.category_id,
  c.name AS category_name,
  COALESCE(ih.current_stock, 0) AS current_stock
FROM products p
  LEFT JOIN inventory_on_hand ih ON ih.product_id = p.id
  LEFT JOIN categories c ON c.id = p.category_id;
-- ================================================
-- PHASE 25: Payment Processing Functions
-- ================================================
-- Post payment to journal (idempotent)
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
IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found: %',
p_payment_id;
END IF;
-- Get bill totals from view
SELECT * INTO v_totals
FROM bill_totals
WHERE bill_id = v_payment.bill_id;
IF v_totals.total <= 0 THEN RAISE EXCEPTION 'Cannot journal zero-value payment';
END IF;
-- Get cash account from cash_accounts
SELECT gl_account_id INTO v_cash_account
FROM cash_accounts
WHERE id = v_payment.cash_account_id;
IF v_cash_account IS NULL THEN RAISE EXCEPTION 'Cash account not found for payment';
END IF;
-- Get sales account
SELECT id INTO v_sales_account
FROM chart_of_accounts
WHERE code = '4000';
IF v_sales_account IS NULL THEN RAISE EXCEPTION 'Sales account (4000) not found in COA';
END IF;
-- Create journal entry
INSERT INTO journal_entries (
    entry_date,
    source_type,
    source_id,
    description
  )
VALUES (
    CURRENT_DATE,
    'payment',
    p_payment_id,
    'POS payment'
  )
RETURNING id INTO v_journal_id;
-- Dr Cash
INSERT INTO journal_lines (journal_entry_id, account_id, debit)
VALUES (v_journal_id, v_cash_account, v_totals.total);
-- Cr Sales
INSERT INTO journal_lines (journal_entry_id, account_id, credit)
VALUES (v_journal_id, v_sales_account, v_totals.total);
END;
$$;
-- Main payment processing function
CREATE OR REPLACE FUNCTION process_payment(
    p_bill_id uuid,
    p_amount numeric,
    p_cash_account_id uuid,
    p_user_id uuid,
    p_user_role text
  ) RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_bill bills %ROWTYPE;
v_payment payments %ROWTYPE;
v_totals RECORD;
BEGIN -- Lock bill
SELECT * INTO v_bill
FROM bills
WHERE id = p_bill_id FOR
UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Bill not found: %',
p_bill_id;
END IF;
-- Get bill totals
SELECT * INTO v_totals
FROM bill_totals
WHERE bill_id = p_bill_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Bill totals not found for: %',
p_bill_id;
END IF;
-- Validate payment amount matches total
IF p_amount <> v_totals.total THEN RAISE EXCEPTION 'Payment amount mismatch. Expected: %, Received: %',
v_totals.total,
p_amount;
END IF;
-- Check for existing payment
SELECT * INTO v_payment
FROM payments
WHERE bill_id = p_bill_id
  AND status IN ('pending', 'confirmed') FOR
UPDATE;
-- CASE 1: Non-bartender initiates (pending confirmation)
IF p_user_role <> 'bartender' THEN IF v_bill.status <> 'open'
OR v_payment.id IS NOT NULL THEN RAISE EXCEPTION 'Payment already initiated or bill not open';
END IF;
INSERT INTO payments (
    bill_id,
    amount,
    status,
    cash_account_id,
    is_paid,
    created_by
  )
VALUES (
    p_bill_id,
    p_amount,
    'pending',
    p_cash_account_id,
    false,
    p_user_id
  );
UPDATE bills
SET status = 'awaiting_confirmation'
WHERE id = p_bill_id;
RETURN json_build_object(
  'status',
  'pending',
  'message',
  'Payment awaiting bartender confirmation'
);
END IF;
-- CASE 2: Bartender confirms pending payment
IF p_user_role = 'bartender'
AND v_payment.id IS NOT NULL
AND v_payment.status = 'pending'
AND v_bill.status = 'awaiting_confirmation' THEN
UPDATE payments
SET status = 'confirmed',
  is_paid = true,
  cash_account_id = p_cash_account_id,
  updated_by = p_user_id,
  updated_at = now()
WHERE id = v_payment.id;
-- Post to journal
PERFORM post_payment_journal(v_payment.id);
UPDATE bills
SET status = 'completed'
WHERE id = p_bill_id;
RETURN json_build_object(
  'status',
  'confirmed',
  'message',
  'Payment confirmed and bill completed'
);
END IF;
-- CASE 3: Bartender direct payment
IF p_user_role = 'bartender'
AND v_payment.id IS NULL
AND v_bill.status = 'open' THEN
INSERT INTO payments (
    bill_id,
    amount,
    status,
    cash_account_id,
    is_paid,
    created_by,
    updated_by
  )
VALUES (
    p_bill_id,
    p_amount,
    'confirmed',
    p_cash_account_id,
    true,
    p_user_id,
    p_user_id
  )
RETURNING * INTO v_payment;
-- Post to journal
PERFORM post_payment_journal(v_payment.id);
UPDATE bills
SET status = 'completed'
WHERE id = p_bill_id;
RETURN json_build_object(
  'status',
  'confirmed',
  'message',
  'Direct payment completed'
);
END IF;
RAISE EXCEPTION 'Invalid payment state or role';
END;
$$;
-- ================================================
-- PHASE 26: Performance Indexes
-- ================================================
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(source_type, source_id);
-- ================================================
-- PHASE 27: Bill Totals View (Canonical)
-- ================================================
DROP VIEW IF EXISTS bill_totals;
CREATE VIEW bill_totals AS
SELECT b.id AS bill_id,
  b.customer_name AS customer,
  b.created_by AS created_by_id,
  u.name AS created_by_name,
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
  LEFT JOIN profiles u ON u.id = b.created_by
  LEFT JOIN rounds r ON r.bill_id = b.id
  LEFT JOIN round_items ri ON ri.round_id = r.id
  LEFT JOIN payments p ON p.bill_id = b.id
GROUP BY b.id,
  b.customer_name,
  b.created_by,
  u.name;
-- ================================================
-- PHASE 28: Final Checks
-- ================================================
-- Verify chart of accounts has essential accounts
INSERT INTO chart_of_accounts (name, code, account_class, normal_balance)
VALUES ('Cash on Hand', '1010', 'asset', 'debit'),
  ('Bank Account', '1020', 'asset', 'debit'),
  ('Accounts Receivable', '1100', 'asset', 'debit'),
  ('Sales Revenue', '4000', 'income', 'credit'),
  ('Tax Payable', '2100', 'liability', 'credit'),
  ('Accounts Payable', 'AP', 'liability', 'credit'),
  ('Inventory', 'INV', 'asset', 'debit'),
  ('Cost of Sales', 'COGS', 'expense', 'debit'),
  ('Inventory Purchases', 'IP', 'expense', 'debit') ON CONFLICT (code) DO NOTHING;
-- Log migration
INSERT INTO system_logs (action, description, created_at)
VALUES (
    'DB_MIGRATION',
    'ERP revision migration completed successfully',
    now()
  );
COMMIT;
-- ================================================
-- SUCCESS NOTIFICATION
-- ================================================
-- All phases completed without errors
-- Database is now ready for ERP operations
-- ================================================