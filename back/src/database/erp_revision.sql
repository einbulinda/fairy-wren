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

TRUNCATE TABLE inventory_items;


/*
::Adding Inventory Categories
*/
WITH inventory_parent AS (
  SELECT id 
  FROM chart_of_accounts 
  WHERE name = 'Inventory' 
  LIMIT 1
)
INSERT INTO chart_of_accounts (
  name,
  account_class,
  parent_id
)
SELECT 
  c.name AS name,
  'asset' AS account_class,  -- ⚠️ Consider 'inventory' if your system supports it (see below)
  ip.id AS parent_id
FROM categories c
CROSS JOIN inventory_parent ip
WHERE NOT EXISTS (
  SELECT 1 
  FROM chart_of_accounts ca 
  WHERE ca.name = c.name 
    AND ca.parent_id = ip.id
)
ON CONFLICT (name, parent_id) DO NOTHING;  -- Requires UNIQUE constraint on (name, parent_id);


--=======================================

/*
BackFill products to categories inventory
*/

ALTER TABLE inventory_items
ADD CONSTRAINT inventory_items_one_per_product
UNIQUE (product_id);


WITH cogs_account AS (
  -- Get the fixed COGS account ID (required)
  SELECT id 
  FROM chart_of_accounts 
  WHERE name = 'Inventory Purchases' 
  LIMIT 1
),
inventory_accounts AS (
  -- Map categories to their corresponding inventory accounts
  SELECT 
    cat.id AS category_id,
    coa.id AS account_id
  FROM categories cat
  JOIN chart_of_accounts coa 
    ON coa.name = cat.name  -- Account name = Category name
),
product_accounts AS (
  -- Get account mappings for every product
  SELECT 
    p.id AS product_id,
    ca.id AS cogs_account_id,
    ia.account_id AS inventory_account_id
  FROM products p
  CROSS JOIN cogs_account ca
  LEFT JOIN inventory_accounts ia 
    ON ia.category_id = p.category_id
  WHERE ca.id IS NOT NULL  -- Skip if COGS account missing
)
-- UPSERT pattern: Update existing rows + Insert missing rows
INSERT INTO inventory_items (
  product_id,
  cogs_account_id,
  inventory_account_id
)
SELECT 
  pa.product_id,
  pa.cogs_account_id,
  pa.inventory_account_id
FROM product_accounts pa
ON CONFLICT (product_id) DO UPDATE  -- Requires UNIQUE constraint on product_id
SET 
  cogs_account_id = EXCLUDED.cogs_account_id,
  inventory_account_id = EXCLUDED.inventory_account_id
WHERE 
  inventory_items.cogs_account_id IS NULL 
  OR inventory_items.inventory_account_id IS NULL
  OR inventory_items.cogs_account_id != EXCLUDED.cogs_account_id
  OR inventory_items.inventory_account_id != EXCLUDED.inventory_account_id;

/*
========================================
Trigger too Early
========================================
*/
DROP TRIGGER IF EXISTS trg_validate_journal_balance ON journal_lines;
  
CREATE CONSTRAINT TRIGGER trg_validate_journal_balance
AFTER INSERT OR UPDATE ON journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION validate_journal_balance();

/*
Protect Double Posting*/
ALTER TABLE round_items
ADD CONSTRAINT round_items_inventory_posted_once
CHECK (
  inventory_posted = true
  OR inventory_posted = false
);

/*
=============================================
VIEW TO FETCH products
=============================================
*/
CREATE OR REPLACE VIEW inventory_on_hand AS
SELECT
  im.product_id,
  COALESCE(SUM(im.quantity), 0) AS current_stock
FROM inventory_movements im
GROUP BY im.product_id;


-- Index for Performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product
ON inventory_movements(product_id);

-- Final VIEW
CREATE OR REPLACE VIEW products_with_stock AS
SELECT
  p.id,
  p.name,
  p.price,
  p.active,
  p.category_id,
  c.name AS category_name,
  COALESCE(ih.current_stock, 0) AS current_stock
FROM products p
LEFT JOIN inventory_on_hand ih ON ih.product_id = p.id
LEFT JOIN categories c ON c.id = p.category_id;

/*
====================================================================
MAKING PAYMENTS
====================================================================
Dr Accounts Receivable (or Cash if direct)
Cr Sales Revenue

| Table               | Responsibility                         |
| ------------------- | -------------------------------------- |
| `payments`          | Workflow + audit (pending / confirmed) |
| `journal_entries`   | Financial truth                        |
| `journal_lines`     | Double-entry                           |
| `chart_of_accounts` | Control accounts                       |
| `bills`             | Commercial document                    |


CHART OF Accounts
| Code | Name                | Type      |
| ---- | ------------------- | --------- |
| 1010 | Cash on Hand        | Asset     |
| 1020 | Mpesa / Bank        | Asset     |
| 1100 | Accounts Receivable | Asset     |
| 4000 | Sales Revenue       | Income    |
| 2100 | Tax Payable         | Liability |

*/

--REVISED RPC 
DECLARE
  v_bill bills%ROWTYPE;
  v_payment payments%ROWTYPE;
  v_cash_account UUID;
  v_sales_account UUID;
  v_tax_account UUID;
  v_journal_id UUID;
BEGIN
  -- Lock bill
  SELECT * INTO v_bill
  FROM bills
  WHERE id = p_bill_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  -- Lock payment if exists
  SELECT * INTO v_payment
  FROM payments
  WHERE bill_id = p_bill_id
    AND status IN ('pending', 'confirmed')
  FOR UPDATE;

  /* ===============================
     CASE 1: NON-BARTENDER INITIATES
     =============================== */
  IF p_user_role <> 'bartender' THEN
    IF v_bill.status <> 'open' OR v_payment.id IS NOT NULL THEN
      RAISE EXCEPTION 'Payment already initiated or bill not open';
    END IF;

    INSERT INTO payments (
      bill_id,
      amount,
      payment_type,
      status,
      created_by
    )
    VALUES (
      p_bill_id,
      p_amount,
      p_payment_type,
      'pending',
      p_user_id
    );

    UPDATE bills
    SET status = 'awaiting_confirmation'
    WHERE id = p_bill_id;

    RETURN json_build_object(
      'status', 'pending',
      'message', 'Payment awaiting confirmation'
    );
  END IF;

  /* ===============================
     CASE 2: BARTENDER CONFIRMS
     =============================== */
  IF p_user_role = 'bartender'
     AND v_payment.id IS NOT NULL
     AND v_payment.status = 'pending'
     AND v_bill.status = 'awaiting_confirmation'
  THEN
    UPDATE payments
    SET status = 'confirmed',
        updated_by = p_user_id,
        updated_at = now()
    WHERE id = v_payment.id;

    -- 🔹 ACCOUNTING STARTS HERE
    SELECT id INTO v_cash_account
    FROM chart_of_accounts
    WHERE code = CASE
      WHEN v_payment.payment_type = 'cash' THEN '1010'
      ELSE '1020'
    END;

    SELECT id INTO v_sales_account
    FROM chart_of_accounts WHERE code = '4000';

    SELECT id INTO v_tax_account
    FROM chart_of_accounts WHERE code = '2100';

    INSERT INTO journal_entries (
      entry_date,
      source_type,
      source_id,
      description
    )
    VALUES (
      CURRENT_DATE,
      'payment',
      v_payment.id,
      'POS payment'
    )
    RETURNING id INTO v_journal_id;

    -- Dr Cash / Bank
    INSERT INTO journal_lines (journal_entry_id, account_id, debit)
    VALUES (v_journal_id, v_cash_account, v_payment.amount);

    -- Cr Sales
    INSERT INTO journal_lines (journal_entry_id, account_id, credit)
    VALUES (v_journal_id, v_sales_account, v_bill.subtotal);

    -- Cr Tax
    IF v_bill.tax > 0 THEN
      INSERT INTO journal_lines (journal_entry_id, account_id, credit)
      VALUES (v_journal_id, v_tax_account, v_bill.tax);
    END IF;

    UPDATE bills
    SET status = 'completed'
    WHERE id = p_bill_id;

    RETURN json_build_object(
      'status', 'confirmed',
      'message', 'Payment confirmed and posted'
    );
  END IF;

  /* ===============================
     CASE 3: BARTENDER DIRECT PAY
     =============================== */
  IF p_user_role = 'bartender'
     AND v_payment.id IS NULL
     AND v_bill.status = 'open'
  THEN
    INSERT INTO payments (
      bill_id,
      amount,
      payment_type,
      status,
      created_by,
      updated_by
    )
    VALUES (
      p_bill_id,
      p_amount,
      p_payment_type,
      'confirmed',
      p_user_id,
      p_user_id
    )
    RETURNING * INTO v_payment;

    -- 🔹 SAME JOURNAL LOGIC HERE (reuse via function ideally)

    UPDATE bills
    SET status = 'completed'
    WHERE id = p_bill_id;

    RETURN json_build_object(
      'status', 'confirmed',
      'message', 'Direct payment completed'
    );
  END IF;

  RAISE EXCEPTION 'Invalid payment state or role';
END;

/*Check Scope of Changes*/
SELECT
  source_type,
  source_id,
  COUNT(*) AS cnt
FROM journal_entries
GROUP BY source_type, source_id
HAVING COUNT(*) > 1
ORDER BY cnt DESC;
/*
============================
INDEXING
============================
*/
CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_source
ON journal_entries (source_type, source_id);

/*
====================================
PARTIAL UNIQUE INDEX 
====================================
*/
CREATE UNIQUE INDEX uq_journal_source_live
ON journal_entries (source_type, source_id)
WHERE source_type IN ('payment', 'sale');

-- LEGACY BACKFILL
UPDATE journal_entries
SET description = description || ' (legacy backfill)'
WHERE source_type = 'sale_backfill';


/*
===========================================
JOURNAL POSTING HELPER FUNCTION
===========================================
*/
CREATE OR REPLACE FUNCTION post_payment_journal(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_totals RECORD;
  v_cash_account uuid;
  v_sales_account uuid;
  v_journal_id uuid;
BEGIN
  /* Idempotency guard */
  IF EXISTS (
    SELECT 1
    FROM journal_entries
    WHERE source_type = 'payment'
      AND source_id = p_payment_id
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id;

  SELECT * INTO v_totals
  FROM bill_totals
  WHERE bill_id = v_payment.bill_id;

  IF v_totals.total <= 0 THEN
    RAISE EXCEPTION 'Cannot journal zero-value payment';
  END IF;

  /* Resolve accounts */
  SELECT id INTO v_cash_account
  FROM chart_of_accounts
  WHERE code = CASE
    WHEN v_payment.payment_type = 'cash' THEN '1010'
    ELSE '1020'
  END;

  SELECT id INTO v_sales_account
  FROM chart_of_accounts
  WHERE code = '4000';

  /* Create journal entry */
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

  /* Dr Cash / Bank */
  INSERT INTO journal_lines (
    journal_entry_id,
    account_id,
    debit
  )
  VALUES (
    v_journal_id,
    v_cash_account,
    v_totals.total
  );

  /* Cr Sales */
  INSERT INTO journal_lines (
    journal_entry_id,
    account_id,
    credit
  )
  VALUES (
    v_journal_id,
    v_sales_account,
    v_totals.total
  );
END;
$$;



/*
=======================================================
process_payment RPC function (PostgreSQL)
- Validates bill existence and amount
- Inserts payment record with status 'pending'
- Updates bill status to 'paid' if fully settled
=======================================================
*/

CREATE OR REPLACE FUNCTION process_payment(
  p_bill_id uuid,
  p_amount numeric,
  p_payment_type text,
  p_user_id uuid,
  p_user_role text
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_bill bills%ROWTYPE;
  v_payment payments%ROWTYPE;
  v_totals RECORD;
BEGIN
  /* =====================================================
     Lock bill
     ===================================================== */
  SELECT * INTO v_bill
  FROM bills
  WHERE id = p_bill_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  /* =====================================================
     Fetch authoritative totals
     ===================================================== */
  SELECT * INTO v_totals
  FROM bill_totals
  WHERE bill_id = p_bill_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill totals not found';
  END IF;

  /* =====================================================
     Enforce payment amount = outstanding balance
     ===================================================== */
  IF p_amount <> v_totals.balance_due THEN
    RAISE EXCEPTION
      'Only full payment is allowed. Expected %, received %',
      v_totals.balance_due,
      p_amount;
  END IF;

  /* =====================================================
     Lock existing payment (if any)
     ===================================================== */
  SELECT * INTO v_payment
  FROM payments
  WHERE bill_id = p_bill_id
    AND status IN ('pending', 'confirmed')
  FOR UPDATE;

  /* =====================================================
     CASE 1: NON-BARTENDER → INITIATE PAYMENT (PENDING)
     ===================================================== */
  IF p_user_role <> 'bartender' THEN
    IF v_bill.status <> 'open' OR v_payment.id IS NOT NULL THEN
      RAISE EXCEPTION 'Payment already initiated or bill not open';
    END IF;

    INSERT INTO payments (
      bill_id,
      amount,
      payment_type,
      status,
      is_paid,
      created_by
    )
    VALUES (
      p_bill_id,
      p_amount,
      p_payment_type,
      'pending',
      false,
      p_user_id
    );

    UPDATE bills
    SET status = 'awaiting_confirmation'
    WHERE id = p_bill_id;

    RETURN json_build_object(
      'status', 'pending',
      'message', 'Payment awaiting confirmation'
    );
  END IF;

  /* =====================================================
     CASE 2: BARTENDER CONFIRMS EXISTING PAYMENT
     ===================================================== */
  IF p_user_role = 'bartender'
     AND v_payment.id IS NOT NULL
     AND v_payment.status = 'pending'
     AND v_bill.status = 'awaiting_confirmation'
  THEN
    UPDATE payments
    SET status = 'confirmed',
        is_paid = true,
        updated_by = p_user_id,
        updated_at = now()
    WHERE id = v_payment.id;

    -- Accounting event
    PERFORM post_payment_journal(v_payment.id);

    UPDATE bills
    SET status = 'completed'
    WHERE id = p_bill_id;

    RETURN json_build_object(
      'status', 'confirmed',
      'message', 'Payment confirmed and bill completed'
    );
  END IF;

  /* =====================================================
     CASE 3: BARTENDER DIRECT PAYMENT
     ===================================================== */
  IF p_user_role = 'bartender'
     AND v_payment.id IS NULL
     AND v_bill.status = 'open'
  THEN
    INSERT INTO payments (
      bill_id,
      amount,
      payment_type,
      status,
      is_paid,
      created_by,
      updated_by
    )
    VALUES (
      p_bill_id,
      p_amount,
      p_payment_type,
      'confirmed',
      true,
      p_user_id,
      p_user_id
    )
    RETURNING * INTO v_payment;

    -- Accounting event
    PERFORM post_payment_journal(v_payment.id);

    UPDATE bills
    SET status = 'completed'
    WHERE id = p_bill_id;

    RETURN json_build_object(
      'status', 'confirmed',
      'message', 'Direct payment completed'
    );
  END IF;

  RAISE EXCEPTION 'Invalid payment state or role';
END;
$$;


/*
======================================================
CANONICAL BILL VIEW
======================================================
*/
DROP VIEW IF EXISTS bill_totals;

CREATE VIEW bill_totals AS
SELECT
  b.id AS bill_id,

  -- Customer info
  b.customer_name AS customer,

  -- Creator info
  b.created_by AS created_by_id,
  u.name        AS created_by_name,

  COALESCE(SUM(ri.quantity * ri.price), 0) AS subtotal,
  0::numeric AS tax,
  COALESCE(SUM(ri.quantity * ri.price), 0) AS total,

  COALESCE(
    SUM(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END),
    0
  ) AS amount_paid,

  COALESCE(SUM(ri.quantity * ri.price), 0)
  -
  COALESCE(
    SUM(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END),
    0
  ) AS balance_due

FROM bills b
LEFT JOIN profiles u ON u.id = b.created_by
LEFT JOIN rounds r   ON r.bill_id = b.id
LEFT JOIN round_items ri ON ri.round_id = r.id
LEFT JOIN payments p ON p.bill_id = b.id
GROUP BY b.id, b.customer_name, b.created_by, u.name;


















