/* Strengthen COA*/
ALTER TABLE chart_of_accounts
ADD COLUMN normal_balance TEXT
CHECK (normal_balance IN ('debit','credit'));

ALTER TABLE chart_of_accounts
ADD COLUMN is_control_account BOOLEAN DEFAULT false;

/*Backfill data for existing*/

UPDATE chart_of_accounts
SET normal_balance = 'debit'
WHERE account_class IN ('asset','expense','cost_of_sales');

UPDATE chart_of_accounts
SET normal_balance = 'credit'
WHERE account_class IN ('liability','equity','income');

/*CASH Accounts*/
CREATE TABLE cash_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('bank','petty_cash','mobile_money')),
  gl_account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

/*Back Fill*/
INSERT INTO cash_accounts (name, type, gl_account_id)
VALUES ('Petty Cash', 'petty_cash', '<PETTY_CASH_GL_ID>'); --Pending

/*Lock Journal Integrity (CRITICAL*/
ALTER TABLE journal_entries
ADD COLUMN posted BOOLEAN DEFAULT true,
ADD COLUMN posted_at TIMESTAMPTZ DEFAULT now();

/* Constraint: debit = credit*/
CREATE OR REPLACE FUNCTION enforce_balanced_journal()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COALESCE(SUM(debit),0) != COALESCE(SUM(credit),0)
    FROM journal_lines
    WHERE journal_entry_id = NEW.journal_entry_id
  ) THEN
    RAISE EXCEPTION 'Journal entry % is not balanced', NEW.journal_entry_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_journal_balance
AFTER INSERT OR UPDATE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION enforce_balanced_journal();

/*AR*/
CREATE TABLE customer_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  total NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('open','partially_paid','paid')),
  created_at TIMESTAMPTZ DEFAULT now()
);

/*Stored procedure: Post customer invoice*/
CREATE OR REPLACE FUNCTION post_customer_invoice(
  p_invoice_id UUID,
  p_ar_account UUID,
  p_revenue_account UUID
) RETURNS VOID AS $$
DECLARE
  v_total NUMERIC;
  v_journal_id UUID;
BEGIN
  SELECT total INTO v_total FROM customer_invoices WHERE id = p_invoice_id;

  INSERT INTO journal_entries (entry_date, source_type, source_id)
  VALUES (CURRENT_DATE, 'customer_invoice', p_invoice_id)
  RETURNING id INTO v_journal_id;

  INSERT INTO journal_lines (journal_entry_id, account_id, debit)
  VALUES (v_journal_id, p_ar_account, v_total);

  INSERT INTO journal_lines (journal_entry_id, account_id, credit)
  VALUES (v_journal_id, p_revenue_account, v_total);
END;
$$ LANGUAGE plpgsql;

/*Stored procedure: Post supplier bill*/
CREATE OR REPLACE FUNCTION post_supplier_bill(
  p_bill_id UUID,
  p_expense_account UUID,
  p_ap_account UUID
) RETURNS VOID AS $$
DECLARE
  v_total NUMERIC;
  v_journal_id UUID;
BEGIN
  SELECT total INTO v_total FROM supplier_bills WHERE id = p_bill_id;

  INSERT INTO journal_entries (entry_date, source_type, source_id)
  VALUES (CURRENT_DATE, 'supplier_bill', p_bill_id)
  RETURNING id INTO v_journal_id;

  INSERT INTO journal_lines (journal_entry_id, account_id, debit)
  VALUES (v_journal_id, p_expense_account, v_total);

  INSERT INTO journal_lines (journal_entry_id, account_id, credit)
  VALUES (v_journal_id, p_ap_account, v_total);
END;
$$ LANGUAGE plpgsql;

/*Payments (Unified, GL-safe)*/
ALTER TABLE payments
ADD COLUMN cash_account_id UUID REFERENCES cash_accounts(id);

/* DATA*/
insert into chart_of_accounts (name, account_class, normal_balance, parent_id, is_control_account) values('Current Assets', 'asset','debit',true)
insert into chart_of_accounts (name, account_class, normal_balance, parent_id, is_control_account) 
  values('Cash & Bank', 'asset','debit',(select id from chart_of_accounts where name ='Current Assets'),true)


insert into cash_accounts (name, type,gl_account_id) values 
  ('Petty Cash','petty_cash',(SELECT id from chart_of_accounts WHERE name ='Current Assets')),
  ('Mpesa','mobile_money',(SELECT id from chart_of_accounts WHERE name ='Current Assets')),
  ('KCB Bank', 'bank',(SELECT id from chart_of_accounts WHERE name ='Current Assets'));
  
update payments set cash_account_id = (select id from cash_accounts where name ='Mpesa') where payment_type = 'mpesa'
update payments set cash_account_id = (select id from cash_accounts where name ='Cash Payments') where payment_type = 'cash'


ALTER TABLE payments
DROP COLUMN payment_type CASCADE;


/*Stored procedure: Apply payment
	Works for:
		- AR payments
		- AP payments
		- Salaries
		- Expenses
*/
CREATE OR REPLACE FUNCTION apply_payment(
  p_source_type TEXT,
  p_source_id UUID,
  p_cash_account UUID,
  p_amount NUMERIC,
  p_control_account UUID
) RETURNS VOID AS $$
DECLARE
  v_journal_id UUID;
BEGIN
  INSERT INTO journal_entries (entry_date, source_type, source_id)
  VALUES (CURRENT_DATE, p_source_type, p_source_id)
  RETURNING id INTO v_journal_id;

  INSERT INTO journal_lines (journal_entry_id, account_id, debit)
  VALUES (v_journal_id, p_control_account, p_amount);

  INSERT INTO journal_lines (journal_entry_id, account_id, credit)
  VALUES (v_journal_id,
    (SELECT gl_account_id FROM cash_accounts WHERE id = p_cash_account),
    p_amount
  );
END;
$$ LANGUAGE plpgsql;

/*Stock Simplification*/
CREATE VIEW inventory_balance AS
SELECT
  product_id,
  SUM(quantity) AS qty_on_hand
FROM inventory_movements
GROUP BY product_id;


CREATE OR REPLACE FUNCTION post_inventory_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Example: sale
  IF NEW.movement_type = 'sale' THEN
    -- Dr COGS / Cr Inventory
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


/*Owner Equity*/
CREATE TABLE capital_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount NUMERIC NOT NULL,
  cash_account_id UUID REFERENCES cash_accounts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

/*Payroll*/
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  mpesa_no TEXT NOT NULL
);

CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period DATE NOT NULL
);

CREATE TABLE payroll_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id UUID REFERENCES payroll_runs(id),
  employee_id UUID REFERENCES employees(id),
  net_amount NUMERIC NOT NULL
);

ALTER TABLE inventory_movements
DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

ALTER TABLE inventory_movements
ADD CONSTRAINT inventory_movements_movement_type_check
CHECK (
  movement_type IN (
    'purchase',
    'sale',
    'adjustment_in',
    'adjustment_out',
    'opening_balance'
  )
);


/*Schema Prep*/
ALTER TABLE inventory_movements
DROP CONSTRAINT inventory_movements_movement_type_check;

ALTER TABLE inventory_movements
ADD CONSTRAINT inventory_movements_movement_type_check
CHECK (
  movement_type IN (
    'purchase',
    'sale',
    'adjustment_in',
    'adjustment_out',
    'opening_balance'
  )
);

/*Drop Constraint to allow migration*/
ALTER TABLE inventory_movements
DROP CONSTRAINT inventory_movements_reference_id_fkey;



/*Migration Script*/
BEGIN;

-- 1️⃣ Create a synthetic reference for traceability
-- (optional but recommended)
WITH opening_ref AS (
  SELECT gen_random_uuid() AS ref_id
)

-- 2️⃣ Insert opening stock as inventory movements
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
SELECT
  p.id AS product_id,
  CURRENT_DATE AS movement_date,
  p.current_stock AS quantity,
  'opening_balance' AS movement_type,
  'system_migration' AS reference_type,
  o.ref_id AS reference_id,
  'opening stock migration' AS reason,
  'Migrated from products.current_stock' AS notes,
  now()
FROM products p
CROSS JOIN opening_ref o
WHERE p.track_inventory = true
  AND p.current_stock IS NOT NULL
  AND p.current_stock > 0;

COMMIT;

/*VIEW for Current Stock*/
CREATE VIEW inventory_current_stock AS
SELECT
  im.product_id,
  p.name, 
  c.name AS category_name,
  COALESCE(SUM(quantity), 0) AS current_stock
FROM inventory_movements im 
LEFT JOIN products p ON im.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
GROUP BY im.product_id, p.name, c.name
ORDER BY current_stock DESC;


/*
COST OF GOODS */
--Allow tracking historical costs.
ALTER TABLE inventory_movements
ADD COLUMN unit_cost NUMERIC(12,4) DEFAULT 0;

/*Back Fill Inventory Receipts into Inventory Movement*/
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
SELECT
  iri.product_id,
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

/*AUTOMATIC Trigger on Receipts*/
CREATE OR REPLACE FUNCTION post_inventory_purchase()
RETURNS TRIGGER AS $$
BEGIN
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attache Trigger
CREATE TRIGGER trg_post_inventory_purchase
AFTER INSERT ON inventory_receipt_items
FOR EACH ROW
EXECUTE FUNCTION post_inventory_purchase();

/*Journal Trigger*/
CREATE OR REPLACE FUNCTION post_inventory_purchase_journal()
RETURNS TRIGGER AS $$
DECLARE
  v_inventory_account UUID;
  v_ap_account UUID;
  v_journal_id UUID;
BEGIN
  SELECT inventory_account_id
  INTO v_inventory_account
  FROM inventory_items
  WHERE id = NEW.product_id;

  SELECT id
  INTO v_ap_account
  FROM chart_of_accounts
  WHERE code = 'AP'; -- your AP control account

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
  VALUES (v_journal_id, v_inventory_account, NEW.line_total);

  INSERT INTO journal_lines (journal_entry_id, account_id, credit)
  VALUES (v_journal_id, v_ap_account, NEW.line_total);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/*Create AVG cost view*/
CREATE OR REPLACE VIEW inventory_avg_cost AS
SELECT
  im.product_id,
  SUM(im.quantity)                        AS qty_on_hand,
  CASE
    WHEN SUM(im.quantity) = 0 THEN 0
    ELSE SUM(im.quantity * im.unit_cost) / SUM(im.quantity)
  END                                     AS avg_unit_cost
FROM inventory_movements im
GROUP BY im.product_id;

/*Guard to Round Items Table*/
ALTER TABLE round_items
ADD COLUMN inventory_posted BOOLEAN DEFAULT false;

/*Trigger function: complete bill → inventory + COGS*/
CREATE OR REPLACE FUNCTION post_bill_inventory_and_cogs()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
BEGIN
  -- Only act on transition to completed
  IF OLD.status <> 'completed' AND NEW.status = 'completed' THEN

    FOR r IN
      SELECT ri.*
      FROM rounds ro
      JOIN round_items ri ON ri.round_id = ro.id
      WHERE ro.bill_id = NEW.id
        AND ri.inventory_posted = false
    LOOP
      -- This calls your existing sale/COGS logic
      PERFORM post_sale_cogs_for_item(
        r.product_id,
        r.quantity,
        r.round_id
      );

      UPDATE round_items
      SET inventory_posted = true
      WHERE id = r.id;
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/*
Attach Trigger to Bills
*/
CREATE TRIGGER trg_bill_completed_inventory
AFTER UPDATE ON bills
FOR EACH ROW
EXECUTE FUNCTION post_bill_inventory_and_cogs();


/*Temporary disabling  for backfills*/
ALTER TABLE bills DISABLE TRIGGER trg_bill_completed_inventory;

/*Identify sales to backfill*/
SELECT
  b.id AS bill_id,
  COUNT(ri.id) AS items_to_post
FROM bills b
JOIN rounds r ON r.bill_id = b.id
JOIN round_items ri ON ri.round_id = r.id
WHERE b.status = 'completed'
  AND ri.inventory_posted = false
GROUP BY b.id;

/*
::Back fill for sales made
*/
CREATE OR REPLACE FUNCTION post_sale_cogs_for_item(
  p_product_id UUID,
  p_quantity NUMERIC,
  p_reference_id UUID
) RETURNS VOID AS $$
DECLARE
  v_avg_cost NUMERIC := 0; --Default to zero upfront
  v_total_cost NUMERIC;
  v_inventory_account UUID;
  v_cogs_account UUID;
  v_journal_id UUID;
BEGIN
  -- Get AVG cost (default to 0 if not found)
  SELECT COALESCE(avg_unit_cost,0)
  INTO v_avg_cost
  FROM inventory_avg_cost
  WHERE product_id = p_product_id;

  v_total_cost := p_quantity * v_avg_cost;

  -- Inventory movement (always record movement even with zero cost)
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
    -p_quantity,
    v_avg_cost,
    'sale',
    'sale_backfill',
    p_reference_id,
	CASE 
      WHEN v_avg_cost = 0 THEN 'Backfilled sale (ZERO COST - no avg_unit_cost available)'
      ELSE 'Backfilled sale'
    END  
  );

  -- Get GL accounts
  SELECT inventory_account_id, cogs_account_id
  INTO v_inventory_account, v_cogs_account
  FROM inventory_items
  WHERE product_id = p_product_id;
  
  -- Skip GL posting if accounts missing OR zero-value transaction
  IF v_inventory_account IS NULL OR v_cogs_account IS NULL OR v_total_cost = 0 THEN
    RETURN;  -- Silent exit - no error, no journal entry
  END IF;

  -- Post journal entry only for meaningful costs
  INSERT INTO journal_entries (
    entry_date,
    source_type,
    source_id,
    description
  )
  VALUES (
    CURRENT_DATE,
    'sale_backfill',
    p_reference_id,
    'Backfilled COGS'
  )
  RETURNING id INTO v_journal_id;

  -- Dr COGS
  INSERT INTO journal_lines (journal_entry_id, account_id, debit,credit)
  VALUES (v_journal_id, v_cogs_account, v_total_cost,0);

  -- Cr Inventory
  INSERT INTO journal_lines (journal_entry_id, account_id, debit,credit)
  VALUES (v_journal_id, v_inventory_account, 0, v_total_cost);
END;
$$ LANGUAGE plpgsql;

/* 
Execute backfill (BATCH SAFE)
*/
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      ri.id AS round_item_id,
      ri.product_id,
      ri.quantity,
      b.id AS bill_id
    FROM bills b
    JOIN rounds ro ON ro.bill_id = b.id
    JOIN round_items ri ON ri.round_id = ro.id
    WHERE b.status = 'completed'
      AND ri.inventory_posted = false
  LOOP
    PERFORM post_sale_cogs_for_item(
      r.product_id,
      r.quantity,
      r.bill_id
    );

    UPDATE round_items
    SET inventory_posted = true
    WHERE id = r.round_item_id;
  END LOOP;
END $$;

/*
Adding product_id to inventory_items profile. 
*/
ALTER TABLE inventory_items
  ADD COLUMN product_id UUID, 
  DROP COLUMN IF EXISTS name CASCADE,
  DROP COLUMN IF EXISTS cost_price CASCADE;

-- Mapping
UPDATE inventory_items ii
SET product_id = p.id
FROM products p
WHERE ii.name = p.name;















