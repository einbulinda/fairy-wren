/*=======================================================================
 MIGRATION RUNNER HELPER
 Allows the migration runner (migrate.js) to execute arbitrary SQL
 via the Supabase JS client.  Restricted to the service_role key.
 ========================================================================*/
CREATE OR REPLACE FUNCTION public.exec_sql(query text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $function$ BEGIN EXECUTE query;
END;
$function$;
CREATE OR REPLACE FUNCTION public.enforce_balanced_journal() RETURNS trigger LANGUAGE plpgsql AS $function$ BEGIN IF (
        SELECT COALESCE(SUM(debit), 0) != COALESCE(SUM(credit), 0)
        FROM journal_lines
        WHERE journal_entry_id = NEW.journal_entry_id
    ) THEN RAISE EXCEPTION 'Journal entry % is not balanced',
    NEW.journal_entry_id;
END IF;
RETURN NEW;
END;
$function$;
/*
 ============================================================================
 ACCOUNTING POSTING FUNCTIONS
 ----------------------------------------------------------------------------
 These functions handle the creation of journal entries for key financial events such as posting customer invoices, supplier bills, and payments. They ensure that all transactions are properly recorded in the general ledger with the correct accounts and amounts.
 Updated: 16/02/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.post_customer_invoice(
        p_invoice_id uuid,
        p_ar_account uuid,
        p_revenue_account uuid
    ) RETURNS void LANGUAGE plpgsql AS $function$
DECLARE v_total NUMERIC;
v_journal_id UUID;
BEGIN
SELECT total INTO v_total
FROM customer_invoices
WHERE id = p_invoice_id;
INSERT INTO journal_entries (entry_date, source_type, source_id)
VALUES (CURRENT_DATE, 'customer_invoice', p_invoice_id)
RETURNING id INTO v_journal_id;
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
VALUES (v_journal_id, p_ar_account, v_total, 0),
    (v_journal_id, p_revenue_account, 0, v_total);
END;
$function$;
/*
 ============================================================================
 POST SUPPLIER BILL FUNCTION
 This function creates the necessary journal entries when a supplier bill is posted. It debits the appropriate expense account and credits accounts payable, ensuring that the company's financial records accurately reflect the new liability.
 Updated: 16/02/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.post_supplier_bill(
        p_bill_id uuid,
        p_expense_account uuid,
        p_ap_account uuid
    ) RETURNS void LANGUAGE plpgsql AS $function$
DECLARE v_total NUMERIC;
v_journal_id UUID;
BEGIN
SELECT total INTO v_total
FROM supplier_bills
WHERE id = p_bill_id;
INSERT INTO journal_entries (entry_date, source_type, source_id)
VALUES (CURRENT_DATE, 'supplier_bill', p_bill_id)
RETURNING id INTO v_journal_id;
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
VALUES (v_journal_id, p_expense_account, v_total, 0),
    (v_journal_id, p_ap_account, 0, v_total);
END;
$function$;
/*
 ============================================================================
 PAYMENTS PROCESSING FUNCTION
 ----------------------------------------------------------------------------
 This function handles the entire payment workflow, including:
 - Validating payment amounts against bill totals
 - Enforcing role-based rules (bartender vs non-bartender)
 - Managing payment states (pending, confirmed)
 - Posting accounting journal entries upon confirmation
 - Deducting inventory for completed bills
 ==============================================================================
 */
CREATE OR REPLACE FUNCTION public.process_payment(
        p_bill_id uuid,
        p_payments jsonb,
        p_user_id uuid,
        p_user_permissions jsonb DEFAULT ‘ [] ’::jsonb
    ) RETURNS json LANGUAGE plpgsql AS $function$
DECLARE v_bill bills %ROWTYPE;
v_totals RECORD;
v_can_approve boolean;
v_payment payments %ROWTYPE;
v_line jsonb;
v_line_amount numeric;
v_line_type text;
v_lines_total numeric := 0;
v_new_status text;
BEGIN v_can_approve := p_user_permissions @> ‘ ["approve_payments"] ’::jsonb;
/* =====================================================
 Lock bill
 ===================================================== */
SELECT * INTO v_bill
FROM bills
WHERE id = p_bill_id FOR
UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION ‘ Bill not found ’;
END IF;
IF v_bill.status NOT IN (‘ open ’, ‘ awaiting_confirmation ’) THEN RAISE EXCEPTION ‘ Bill is not payable (status: %) ’,
v_bill.status;
END IF;
/* =====================================================
 Fetch authoritative totals
 ===================================================== */
SELECT * INTO v_totals
FROM bill_totals
WHERE bill_id = p_bill_id;
IF NOT FOUND THEN RAISE EXCEPTION ‘ Bill totals not found ’;
END IF;
/* =====================================================
 CASE 2: CONFIRM ALL PENDING PAYMENTS (approve_payments)
 When bill is awaiting_confirmation and user can approve,
 confirm all pending payments in one go.
 p_payments is ignored — we use actual pending totals.
 ===================================================== */
IF v_can_approve
AND v_bill.status = ‘ awaiting_confirmation ‘ THEN FOR v_payment IN
SELECT *
FROM payments
WHERE bill_id = p_bill_id
    AND status = ‘ pending ’ FOR
UPDATE LOOP
UPDATE payments
SET status = ‘ confirmed ’,
    is_paid = true,
    updated_by = p_user_id,
    updated_at = now()
WHERE id = v_payment.id;
PERFORM post_payment_journal(v_payment.id);
END LOOP;
SELECT * INTO v_totals
FROM bill_totals
WHERE bill_id = p_bill_id;
IF v_totals.balance_due <= 0 THEN v_new_status := ‘ completed ’;
ELSE v_new_status := ‘ open ’;
END IF;
UPDATE bills
SET status = v_new_status
WHERE id = p_bill_id;
RETURN json_build_object(
    ‘ status ’,
    ‘ confirmed ’,
    ‘ message ’,
    CASE
        WHEN v_new_status = ‘ completed ’ THEN ‘ Payments confirmed
        and bill completed ’
        ELSE ‘ Payments confirmed.Bill has remaining balance ’
    END,
    ‘ balance_due ’,
    v_totals.balance_due,
    ‘ amount_paid ’,
    v_totals.amount_paid,
    ‘ pending_amount ’,
    0
);
END IF;
/* =====================================================
 Validate payment lines
 ===================================================== */
IF p_payments IS NULL
OR jsonb_array_length(p_payments) = 0 THEN RAISE EXCEPTION ‘ At least one payment line is required ’;
END IF;
FOR v_line IN
SELECT *
FROM jsonb_array_elements(p_payments) LOOP v_line_amount := (v_line->>’ amount ’)::numeric;
v_line_type := v_line->>’ method ’;
IF v_line_amount IS NULL
OR v_line_amount <= 0 THEN RAISE EXCEPTION ‘ Each payment line must have a positive amount ’;
END IF;
IF v_line_type IS NULL
OR v_line_type NOT IN (‘ cash ’, ‘ mpesa ’) THEN RAISE EXCEPTION ‘ Invalid payment type: % ’,
v_line_type;
END IF;
v_lines_total := v_lines_total + v_line_amount;
END LOOP;
IF NOT v_can_approve THEN IF v_lines_total > v_totals.payable_amount THEN RAISE EXCEPTION ‘ Total % exceeds payable balance %. Paid: %,
Pending: % ’,
v_lines_total,
v_totals.payable_amount,
v_totals.amount_paid,
v_totals.pending_amount;
END IF;
ELSE IF v_lines_total > v_totals.balance_due THEN RAISE EXCEPTION ‘ Total % exceeds balance due % ’,
v_lines_total,
v_totals.balance_due;
END IF;
END IF;
/* =====================================================
 CASE 1: NO approve_payments → INITIATE PAYMENTS (PENDING)
 ===================================================== */
IF NOT v_can_approve THEN FOR v_line IN
SELECT *
FROM jsonb_array_elements(p_payments) LOOP
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
        (v_line->>’ amount ’)::numeric,
        v_line->>’ method ’,
        ‘ pending ’,
        false,
        p_user_id
    );
END LOOP;
UPDATE bills
SET status = ‘ awaiting_confirmation ’
WHERE id = p_bill_id;
SELECT * INTO v_totals
FROM bill_totals
WHERE bill_id = p_bill_id;
RETURN json_build_object(
    ‘ status ’,
    ‘ pending ’,
    ‘ message ’,
    ‘ Payment awaiting confirmation ’,
    ‘ balance_due ’,
    v_totals.balance_due,
    ‘ amount_paid ’,
    v_totals.amount_paid,
    ‘ pending_amount ’,
    v_totals.pending_amount
);
END IF;
/* =====================================================
 CASE 3: DIRECT PAYMENTS (approve_payments)
 ===================================================== */
IF v_can_approve THEN FOR v_line IN
SELECT *
FROM jsonb_array_elements(p_payments) LOOP
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
        (v_line->>’ amount ’)::numeric,
        v_line->>’ method ’,
        ‘ confirmed ’,
        true,
        p_user_id,
        p_user_id
    )
RETURNING * INTO v_payment;
PERFORM post_payment_journal(v_payment.id);
END LOOP;
SELECT * INTO v_totals
FROM bill_totals
WHERE bill_id = p_bill_id;
IF v_totals.balance_due <= 0 THEN v_new_status := ‘ completed ’;
ELSE v_new_status := ‘ open ’;
END IF;
UPDATE bills
SET status = v_new_status
WHERE id = p_bill_id;
RETURN json_build_object(
    ‘ status ’,
    ‘ confirmed ’,
    ‘ message ’,
    CASE
        WHEN v_new_status = ‘ completed ’ THEN ‘ Payment completed ’
        ELSE ‘ Partial payment recorded ’
    END,
    ‘ balance_due ’,
    v_totals.balance_due,
    ‘ amount_paid ’,
    v_totals.amount_paid,
    ‘ pending_amount ’,
    v_totals.pending_amount
);
END IF;
RAISE EXCEPTION ‘ Invalid payment state
or insufficient permissions ’;
END;
$function$;
/*
 ============================================================================
 POST ROUND SALE FUNCTION
 ----------------------------------------------------------------------------
 Called when a round is submitted (items served to customer).
 Per IFRS 15.31-34, revenue is recognized at point of control transfer.
 Per IAS 2.34, COGS is matched to the same period.
 
 Actions:
 1. For each round_item: insert inventory_movement (sale, -qty)
 2. For each round_item: post COGS journal (Dr COGS, Cr Inventory)
 3. For the round total: post revenue journal (Dr A/R Open Bills, Cr Sales)
 4. Set round_items.inventory_posted = true
 
 products.current_stock is recalculated automatically by the existing
 trg_update_inventory trigger on inventory_movements.
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.post_round_sale(p_round_id uuid) RETURNS void LANGUAGE plpgsql AS $function$
DECLARE v_item RECORD;
v_avg_cost NUMERIC;
v_total_cost NUMERIC;
v_inventory_account UUID;
v_purchases_account UUID;
v_cogs_journal_id UUID;
v_revenue_journal_id UUID;
v_ar_account UUID;
v_sales_account UUID;
v_round_total NUMERIC := 0;
v_total_cogs NUMERIC := 0;
v_bill_id UUID;
v_round_date DATE;
BEGIN
/* Idempotency guard */
IF EXISTS (
    SELECT 1
    FROM journal_entries
    WHERE source_type = 'round_sale'
        AND source_id = p_round_id
) THEN RETURN;
END IF;
/* Get the bill_id and round date for this round */
SELECT r.bill_id,
    r.created_at::date INTO v_bill_id,
    v_round_date
FROM rounds r
WHERE r.id = p_round_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Round not found: %',
p_round_id;
END IF;
/* Resolve Inventory Purchases account (5003) once */
SELECT id INTO v_purchases_account
FROM chart_of_accounts
WHERE code = '5003';
IF v_purchases_account IS NULL THEN RAISE EXCEPTION 'Inventory Purchases account (5003) not found in chart_of_accounts';
END IF;
/* -------------------------------------------------------
 LOOP: Inventory deduction per item
 ------------------------------------------------------- */
FOR v_item IN
SELECT ri.id,
    ri.product_id,
    ri.quantity,
    ri.price
FROM round_items ri
WHERE ri.round_id = p_round_id
    AND ri.inventory_posted = false LOOP
    /* Accumulate round total for revenue entry */
    v_round_total := v_round_total + (v_item.quantity * v_item.price);
/* Get weighted average cost */
SELECT COALESCE(avg_unit_cost, 0) INTO v_avg_cost
FROM inventory_avg_cost
WHERE product_id = v_item.product_id;
IF v_avg_cost IS NULL THEN v_avg_cost := 0;
END IF;
v_total_cost := v_item.quantity * v_avg_cost;
v_total_cogs := v_total_cogs + v_total_cost;
/* 1. Insert inventory movement (negative qty = sale) */
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
        v_item.product_id,
        v_round_date,
        - v_item.quantity,
        v_avg_cost,
        'sale',
        'round',
        p_round_id,
        'Sale via round submission'
    );
/* 2. Mark item as posted */
UPDATE round_items
SET inventory_posted = true
WHERE id = v_item.id;
END LOOP;
/* -------------------------------------------------------
 COGS journal: single entry for entire round
 DR Inventory Purchases (5003), CR Inventory asset
 ------------------------------------------------------- */
IF v_total_cogs > 0 THEN
/* Use the inventory account from the first item with one */
SELECT ii.inventory_account_id INTO v_inventory_account
FROM round_items ri
    JOIN inventory_items ii ON ii.product_id = ri.product_id
WHERE ri.round_id = p_round_id
    AND ii.inventory_account_id IS NOT NULL
LIMIT 1;
IF v_inventory_account IS NOT NULL THEN
INSERT INTO journal_entries (
        entry_date,
        source_type,
        source_id,
        description
    )
VALUES (
        v_round_date,
        'round_cogs',
        p_round_id,
        'COGS on sale'
    )
RETURNING id INTO v_cogs_journal_id;
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
VALUES (
        v_cogs_journal_id,
        v_purchases_account,
        v_total_cogs,
        0
    ),
    (
        v_cogs_journal_id,
        v_inventory_account,
        0,
        v_total_cogs
    );
END IF;
END IF;
/* -------------------------------------------------------
 Revenue recognition: Dr A/R Open Bills, Cr Sales
 Use the round's date (when items were served)
 ------------------------------------------------------- */
IF v_round_total > 0 THEN
SELECT id INTO v_ar_account
FROM chart_of_accounts
WHERE code = '1201';
SELECT id INTO v_sales_account
FROM chart_of_accounts
WHERE code = '4000';
IF v_ar_account IS NULL THEN RAISE EXCEPTION 'A/R Open Bills account (1201) not found in chart_of_accounts';
END IF;
IF v_sales_account IS NULL THEN RAISE EXCEPTION 'Sales Revenue account (4000) not found in chart_of_accounts';
END IF;
INSERT INTO journal_entries (
        entry_date,
        source_type,
        source_id,
        description
    )
VALUES (
        v_round_date,
        'round_sale',
        p_round_id,
        'Revenue on round served'
    )
RETURNING id INTO v_revenue_journal_id;
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
VALUES (
        v_revenue_journal_id,
        v_ar_account,
        v_round_total,
        0
    ),
    (
        v_revenue_journal_id,
        v_sales_account,
        0,
        v_round_total
    );
END IF;
END;
$function$;
/*
 ============================================================================
 REVERSE BILL SALE FUNCTION
 ----------------------------------------------------------------------------
 Called when a bill is voided. Reverses all inventory movements and journal
 entries that were posted at round submission.
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.reverse_bill_sale(p_bill_id uuid) RETURNS void LANGUAGE plpgsql AS $function$
DECLARE v_round RECORD;
v_item RECORD;
v_entry RECORD;
v_reversal_id UUID;
v_avg_cost NUMERIC;
BEGIN
/* Loop through each round in the bill */
FOR v_round IN
SELECT id
FROM rounds
WHERE bill_id = p_bill_id LOOP
    /* 1. Reverse inventory movements for this round */
    FOR v_item IN
SELECT ri.id,
    ri.product_id,
    ri.quantity
FROM round_items ri
WHERE ri.round_id = v_round.id
    AND ri.inventory_posted = true LOOP
    /* Get the cost that was used in the original movement */
SELECT COALESCE(unit_cost, 0) INTO v_avg_cost
FROM inventory_movements
WHERE reference_type = 'round'
    AND reference_id = v_round.id
    AND product_id = v_item.product_id
    AND quantity < 0
LIMIT 1;
IF v_avg_cost IS NULL THEN v_avg_cost := 0;
END IF;
/* Insert reversal movement (positive qty = stock restored) */
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
        v_item.product_id,
        CURRENT_DATE,
        v_item.quantity,
        v_avg_cost,
        'adjustment_in',
        'void',
        v_round.id,
        'Reversal - bill voided'
    );
/* Mark as unposted */
UPDATE round_items
SET inventory_posted = false
WHERE id = v_item.id;
END LOOP;
/* 2. Reverse all journal entries for this round */
FOR v_entry IN
SELECT je.id,
    je.source_type,
    je.source_id,
    je.description
FROM journal_entries je
WHERE je.source_id = v_round.id
    AND je.source_type IN ('round_sale', 'round_cogs')
    AND je.reversed_entry_id IS NULL LOOP
    /* Create reversal journal entry */
INSERT INTO journal_entries (
        entry_date,
        source_type,
        source_id,
        description,
        reversed_entry_id
    )
VALUES (
        CURRENT_DATE,
        v_entry.source_type || '_reversal',
        v_entry.source_id,
        v_entry.description || ' (VOID REVERSAL)',
        v_entry.id
    )
RETURNING id INTO v_reversal_id;
/* Reverse all lines (swap debit/credit) */
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
SELECT v_reversal_id,
    jl.account_id,
    jl.credit,
    jl.debit
FROM journal_lines jl
WHERE jl.journal_entry_id = v_entry.id;
/* Mark original as reversed */
UPDATE journal_entries
SET reversed_entry_id = v_reversal_id
WHERE id = v_entry.id;
END LOOP;
END LOOP;
END;
$function$;
/*
 ============================================================================
 POST PAYMENTS JOURNAL FUNCTION
 ----------------------------------------------------------------------------
 This function creates the necessary journal entries when a payment is confirmed.
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.post_payment_journal(p_payment_id uuid) RETURNS void LANGUAGE plpgsql AS $function$
DECLARE v_payment payments %ROWTYPE;
v_cash_account uuid;
v_ar_account uuid;
v_journal_id uuid;
BEGIN
/* Idempotency guard */
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
IF v_payment.amount <= 0 THEN RAISE EXCEPTION 'Cannot journal zero-value payment';
END IF;
/* Resolve accounts */
SELECT id INTO v_cash_account
FROM chart_of_accounts
WHERE code = CASE
        WHEN v_payment.payment_type = 'cash' THEN '1010'
        ELSE '1020'
    END;
/* Revenue already recognized at round submission (Dr A/R, Cr Sales).
 Payment settles the receivable: Dr Cash/Bank, Cr A/R Open Bills. */
SELECT id INTO v_ar_account
FROM chart_of_accounts
WHERE code = '1201';
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
        'POS payment - settle A/R'
    )
RETURNING id INTO v_journal_id;
/* Dr Cash / Bank, Cr A/R Open Bills — use actual payment amount */
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
VALUES (
        v_journal_id,
        v_cash_account,
        v_payment.amount,
        0
    ),
    (v_journal_id, v_ar_account, 0, v_payment.amount);
END;
$function$;
/*
 ============================================================================
 STOCK TAKE FUNCTIONS
 ----------------------------------------------------------------------------
 These functions manage the entire lifecycle of a stock take session, including:
 - Creation of stock take sessions
 - Recording of individual item counts and variances
 - Automatic calculation of variance percentages and value impacts
 - Approval workflow with audit logging
 - Application of inventory adjustments upon approval
 Updated: 16/02/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.approve_stock_take(
        p_stock_take_id uuid,
        p_reviewed_by_id uuid,
        p_approval_notes text DEFAULT NULL::text
    ) RETURNS jsonb LANGUAGE plpgsql AS $function$
DECLARE v_reviewer_name VARCHAR(200);
v_result JSONB;
BEGIN -- Get reviewer name
SELECT name INTO v_reviewer_name
FROM profiles
WHERE id = p_reviewed_by_id;
-- Update stock take
UPDATE stock_takes
SET approval_status = 'approved',
    reviewed_by_id = p_reviewed_by_id,
    reviewed_at = NOW(),
    approval_notes = p_approval_notes
WHERE id = p_stock_take_id;
-- Apply adjustments to inventory
PERFORM apply_stock_take_adjustments(p_stock_take_id);
-- Log audit entry
INSERT INTO stock_take_audit_log (
        stock_take_id,
        action_type,
        performed_by_id,
        performed_by_name,
        new_values
    )
VALUES (
        p_stock_take_id,
        'approved',
        p_reviewed_by_id,
        v_reviewer_name,
        jsonb_build_object('notes', p_approval_notes)
    );
v_result := jsonb_build_object('success', true, 'status', 'approved');
RETURN v_result;
END;
$function$;
CREATE OR REPLACE FUNCTION public.calculate_variance_percentage() RETURNS trigger LANGUAGE plpgsql AS $function$ BEGIN IF NEW.system_qty > 0 THEN NEW.variance_percentage := (
        (NEW.physical_qty - NEW.system_qty)::DECIMAL / NEW.system_qty
    ) * 100;
ELSE NEW.variance_percentage := NULL;
END IF;
NEW.total_value_adjustment := (NEW.physical_qty - NEW.system_qty) * COALESCE(NEW.cost_per_unit, 0);
RETURN NEW;
END;
$function$;
/*
 ============================================================================
 APPLY STOCK TAKE ADJUSTMENTS FUNCTION
 This function applies the necessary inventory movements based on the recorded variances in a stock take session. 
 It creates inventory movement records for each item that has a variance, which can then be used to update stock levels and trigger any necessary accounting entries.
 Updated: 23/02/2026 @1830hrs - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.apply_stock_take_adjustments(p_stock_take_id uuid) RETURNS void LANGUAGE plpgsql AS $function$
DECLARE v_item RECORD;
BEGIN -- Loop through all items in the stock take
FOR v_item IN
SELECT product_id,
    variance,
    reason,
    notes
FROM stock_take_items
WHERE stock_take_id = p_stock_take_id LOOP -- Log inventory movement (inventory_movements is the only source of truth)
INSERT INTO inventory_movements (
        product_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        reason,
        notes,
        movement_date,
        created_at
    )
VALUES (
        v_item.product_id,
        CASE
            WHEN v_item.variance > 0 THEN 'adjustment_in'
            ELSE 'adjustment_out'
        END,
        v_item.variance,
        'stock_take',
        p_stock_take_id,
        v_item.reason,
        v_item.notes,
        CURRENT_DATE,
        NOW()
    );
END LOOP;
END;
$function$;
CREATE OR REPLACE FUNCTION public.complete_stock_take_session(p_stock_take_id uuid, p_completed_by_id uuid) RETURNS jsonb LANGUAGE plpgsql AS $function$
DECLARE v_item_count INTEGER;
v_total_value_impact DECIMAL(10, 2);
v_flagged_items INTEGER;
v_requires_approval BOOLEAN;
v_user_name VARCHAR(200);
v_result JSONB;
BEGIN -- Get completion stats
SELECT COUNT(*),
    COALESCE(SUM(total_value_adjustment), 0),
    COUNT(*) FILTER (
        WHERE ABS(variance) > 10
            OR ABS(variance_percentage) > 20
    ) INTO v_item_count,
    v_total_value_impact,
    v_flagged_items
FROM stock_take_items
WHERE stock_take_id = p_stock_take_id;
-- Check if requires approval
v_requires_approval := v_flagged_items > 0
OR ABS(v_total_value_impact) > 5000;
-- Get user name
SELECT name INTO v_user_name
FROM profiles
WHERE id = p_completed_by_id;
-- Update stock take
UPDATE stock_takes
SET completed_at = NOW(),
    approval_status = CASE
        WHEN v_requires_approval THEN 'under_review'
        ELSE 'approved'
    END
WHERE id = p_stock_take_id;
-- Apply adjustments to inventory if auto-approved
IF NOT v_requires_approval THEN PERFORM apply_stock_take_adjustments(p_stock_take_id);
END IF;
-- Log audit entry
INSERT INTO stock_take_audit_log (
        stock_take_id,
        action_type,
        performed_by_id,
        performed_by_name,
        new_values
    )
VALUES (
        p_stock_take_id,
        'completed',
        p_completed_by_id,
        v_user_name,
        jsonb_build_object(
            'item_count',
            v_item_count,
            'total_value_impact',
            v_total_value_impact,
            'flagged_items',
            v_flagged_items,
            'requires_approval',
            v_requires_approval
        )
    );
-- Build result
v_result := jsonb_build_object(
    'success',
    true,
    'item_count',
    v_item_count,
    'total_value_impact',
    v_total_value_impact,
    'flagged_items',
    v_flagged_items,
    'requires_approval',
    v_requires_approval,
    'status',
    CASE
        WHEN v_requires_approval THEN 'under_review'
        ELSE 'approved'
    END
);
RETURN v_result;
END;
$function$;
CREATE OR REPLACE FUNCTION public.confirm_bill_and_payments(
        p_bill_id uuid,
        p_user_id uuid,
        p_payment_mode character varying DEFAULT NULL::character varying
    ) RETURNS void LANGUAGE plpgsql AS $function$
declare v_bill_total numeric;
v_payment_total numeric;
begin -- Validate payment mode if provided
if p_payment_mode is not null
and p_payment_mode not in ('cash', 'mpesa') then raise exception 'Invalid payment mode: %',
p_payment_mode;
end if;
-- Lock bill row
select total into v_bill_total
from bills
where id = p_bill_id for
update;
if not found then raise exception 'Bill not found';
end if;
-- Prevent double confirmation
if exists (
    select 1
    from bills
    where id = p_bill_id
        and status = 'completed'
) then raise exception 'Bill already completed';
end if;
-- Calculate total payments (paid or unpaid)
select coalesce(sum(amount), 0) into v_payment_total
from payments
where bill_id = p_bill_id;
if v_payment_total = 0 then raise exception 'No payments recorded for bill';
end if;
-- Enforce full settlement
--if v_payment_total <> v_bill_total then raise exception 'Payment total (%) does not match bill total (%)',
--v_payment_total,
--v_bill_total;
--end if;
-- Mark bill as completed
update bills
set status = 'completed',
    updated_at = now(),
    updated_by = p_user_id
where id = p_bill_id;
-- Finalize payments
update payments
set is_paid = true,
    payment_type = coalesce(payment_type, p_payment_mode),
    updated_at = now(),
    updated_by = p_user_id
where bill_id = p_bill_id;
end;
$function$;
CREATE OR REPLACE FUNCTION public.create_stock_take_session(
        p_performed_by_id uuid,
        p_stock_take_name character varying DEFAULT NULL::character varying,
        p_stock_take_type character varying DEFAULT 'full'::character varying,
        p_location character varying DEFAULT NULL::character varying
    ) RETURNS uuid LANGUAGE plpgsql AS $function$
DECLARE v_stock_take_id UUID;
v_user_name VARCHAR(200);
v_user_role VARCHAR(50);
BEGIN -- Get user details
SELECT name,
    role INTO v_user_name,
    v_user_role
FROM profiles
WHERE id = p_performed_by_id;
-- Create stock take session
INSERT INTO stock_takes (
        performed_by_id,
        performed_by_role,
        stock_take_name,
        stock_take_type,
        location,
        approval_status,
        created_at
    )
VALUES (
        p_performed_by_id,
        v_user_role,
        p_stock_take_name,
        p_stock_take_type,
        p_location,
        'pending',
        NOW()
    )
RETURNING id INTO v_stock_take_id;
-- Log audit entry
INSERT INTO stock_take_audit_log (
        stock_take_id,
        action_type,
        performed_by_id,
        performed_by_name,
        new_values
    )
VALUES (
        v_stock_take_id,
        'created',
        p_performed_by_id,
        v_user_name,
        jsonb_build_object(
            'stock_take_name',
            p_stock_take_name,
            'stock_take_type',
            p_stock_take_type,
            'location',
            p_location
        )
    );
RETURN v_stock_take_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public.recalc_inventory_receipt_total() RETURNS trigger LANGUAGE plpgsql AS $function$
declare rid uuid;
begin rid := coalesce(new.receipt_id, old.receipt_id);
update public.inventory_receipts r
set total_amount = (
        select coalesce(sum(i.line_total), 0)
        from public.inventory_receipt_items i
        where i.receipt_id = rid
    )
where r.id = rid;
return null;
end;
$function$;
CREATE OR REPLACE FUNCTION public.record_stock_take_item(
        p_stock_take_id uuid,
        p_product_id uuid,
        p_physical_qty integer,
        p_reason character varying DEFAULT NULL::character varying,
        p_notes text DEFAULT NULL::text
    ) RETURNS jsonb LANGUAGE plpgsql AS $function$
DECLARE v_system_qty INTEGER;
v_cost_per_unit DECIMAL(10, 2);
v_adjustment INTEGER;
v_product_name VARCHAR(200);
v_previous_adj_date TIMESTAMP WITH TIME ZONE;
v_adj_frequency INTEGER;
v_result JSONB;
BEGIN -- =========================================
-- Get current system quantity and cost
-- =========================================
SELECT current_stock,
    cost_price,
    name INTO v_system_qty,
    v_cost_per_unit,
    v_product_name
FROM products
WHERE id = p_product_id;
-- If product not found â†’ Fail fast
IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found in products table',
p_product_id;
END IF;
-- Null protection (if DB fields are nullable)
v_system_qty := COALESCE(v_system_qty, 0);
v_cost_per_unit := COALESCE(v_cost_per_unit, 0);
-- =========================================
-- Calculate adjustment
-- =========================================
v_adjustment := p_physical_qty - v_system_qty;
-- =========================================
-- Check for previous adjustments
-- =========================================
SELECT MAX(sti.created_at),
    COUNT(*) INTO v_previous_adj_date,
    v_adj_frequency
FROM stock_take_items sti
    JOIN stock_takes st ON sti.stock_take_id = st.id
WHERE sti.product_id = p_product_id
    AND st.completed_at IS NOT NULL
    AND sti.created_at < NOW();
-- =========================================
-- Insert stock take item
-- =========================================
INSERT INTO stock_take_items (
        stock_take_id,
        product_id,
        system_qty,
        physical_qty,
        variance,
        cost_per_unit,
        reason,
        notes,
        previous_adjustment_date,
        adjustment_frequency,
        created_at
    )
VALUES (
        p_stock_take_id,
        p_product_id,
        v_system_qty,
        p_physical_qty,
        v_adjustment,
        v_cost_per_unit,
        p_reason,
        p_notes,
        v_previous_adj_date,
        COALESCE(v_adj_frequency, 0),
        NOW()
    );
-- =========================================
-- Build result JSON
-- =========================================
v_result := jsonb_build_object(
    'product_name',
    v_product_name,
    'system_qty',
    v_system_qty,
    'physical_qty',
    p_physical_qty,
    'adjustment',
    v_adjustment,
    'cost_per_unit',
    v_cost_per_unit,
    'total_value_adjustment',
    v_adjustment * v_cost_per_unit,
    'requires_approval',
    ABS(v_adjustment) > 10
);
RETURN v_result;
END;
$function$;
CREATE OR REPLACE FUNCTION public.record_stock_take_items_bulk(p_items jsonb) RETURNS jsonb LANGUAGE plpgsql AS $function$
DECLARE v_item JSONB;
v_result JSONB;
v_results JSONB := '[]'::jsonb;
BEGIN -- Safety check
IF p_items IS NULL
OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Items list cannot be empty';
END IF;
-- Loop through each item
FOR v_item IN
SELECT *
FROM jsonb_array_elements(p_items) LOOP -- Call your main RPC
    v_result := record_stock_take_item(
        (v_item->>'stock_take_id')::uuid,
        (v_item->>'product_id')::uuid,
        (v_item->>'physical_qty')::int,
        v_item->>'reason',
        v_item->>'notes'
    );
-- Append result to results array
v_results := v_results || jsonb_build_array(v_result);
END LOOP;
RETURN v_results;
END;
$function$;
CREATE OR REPLACE FUNCTION public.reject_stock_take(
        p_stock_take_id uuid,
        p_reviewed_by_id uuid,
        p_rejection_reason text
    ) RETURNS jsonb LANGUAGE plpgsql AS $function$
DECLARE v_reviewer_name VARCHAR(200);
v_result JSONB;
BEGIN -- Get reviewer name
SELECT name INTO v_reviewer_name
FROM profiles
WHERE id = p_reviewed_by_id;
-- Update stock take
UPDATE stock_takes
SET approval_status = 'rejected',
    reviewed_by_id = p_reviewed_by_id,
    reviewed_at = NOW(),
    approval_notes = p_rejection_reason
WHERE id = p_stock_take_id;
-- Log audit entry
INSERT INTO stock_take_audit_log (
        stock_take_id,
        action_type,
        performed_by_id,
        performed_by_name,
        new_values
    )
VALUES (
        p_stock_take_id,
        'rejected',
        p_reviewed_by_id,
        v_reviewer_name,
        jsonb_build_object('reason', p_rejection_reason)
    );
v_result := jsonb_build_object('success', true, 'status', 'rejected');
RETURN v_result;
END;
$function$;
/*
 ============================================================================
 REPORTING FUNCTIONS
 ----------------------------------------------------------------------------
 These functions provide aggregated data for various reports and dashboards. 
 They are designed to be efficient and leverage pre-aggregated views where possible.
 Updated: 16/02/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.rpc_avg_bill_value(p_start_date date, p_end_date date) RETURNS numeric LANGUAGE sql STABLE AS $function$
select avg(bt.total)
from v_bill_totals bt
    join bills b on b.id = bt.bill_id
    join payments p on p.bill_id = b.id
where date(p.created_at) between p_start_date and p_end_date
    and b.status = 'completed'
    and p.is_paid = true;
$function$;
/*
 ============================================================================
 CATEGORY SALES REPORT
 This function calculates total quantity sold and total sales amount for each product category within a specified date range. It joins multiple tables to ensure accurate aggregation based on completed bills and paid payments.
 Updated: 16 / 02 / 2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.rpc_category_sales(p_start_date date, p_end_date date) RETURNS TABLE(
        category_id uuid,
        category_name character varying,
        total_quantity integer,
        total_sales numeric
    ) LANGUAGE sql STABLE AS $function$
select c.id,
    c.name,
    sum(ri.quantity) as total_quantity,
    sum(ri.price * ri.quantity) as total_sales
from round_items ri
    join rounds r on r.id = ri.round_id
    join bills b on b.id = r.bill_id
    join payments pm on pm.bill_id = b.id
    join products p on p.id = ri.product_id
    join categories c on c.id = p.category_id
where b.status = 'completed'
    and pm.is_paid = true
    and date(pm.created_at) between p_start_date and p_end_date
group by c.id,
    c.name
order by total_sales desc;
$function$;
CREATE OR REPLACE FUNCTION public.rpc_daily_revenue(p_start_date date, p_end_date date) RETURNS TABLE(
        business_date date,
        total_revenue numeric,
        total_orders bigint
    ) LANGUAGE sql STABLE AS $function$
select date(p.created_at) as business_date,
    sum(p.amount) as total_revenue,
    count(distinct p.bill_id) as total_orders
from payments p
    join bills b on b.id = p.bill_id
where p.is_paid = true
    and b.status != 'void'
    and date(p.created_at) between p_start_date and p_end_date
group by date(p.created_at)
order by business_date;
$function$;
CREATE OR REPLACE FUNCTION public.rpc_outstanding_bills(p_start_date date, p_end_date date) RETURNS TABLE(
        bill_id uuid,
        bill_total numeric,
        paid_amount numeric,
        outstanding_amount numeric,
        customer_name text,
        served_by text,
        created_at timestamp with time zone
    ) LANGUAGE sql STABLE AS $function$
select bf.bill_id,
    bf.bill_total,
    bf.paid_amount,
    bf.outstanding_amount,
    b.customer_name,
    p.name as served_by,
    b.created_at
from v_bill_financials bf
    join bills b on b.id = bf.bill_id
    left join profiles p on p.id = b.created_by
where date(b.created_at) between p_start_date and p_end_date
    and b.status != 'void'
    and bf.outstanding_amount > 0
order by outstanding_amount desc;
$function$;
CREATE OR REPLACE FUNCTION public.rpc_payment_type_summary(p_start_date date, p_end_date date) RETURNS TABLE(
        payment_type character varying,
        total_amount numeric,
        count bigint
    ) LANGUAGE sql STABLE AS $function$
select p.payment_type,
    sum(p.amount) as total_amount,
    count(*) as count
from payments p
    join bills b on b.id = p.bill_id
where p.is_paid = true
    and b.status != 'void'
    and date(p.created_at) between p_start_date and p_end_date
group by p.payment_type
order by p.payment_type;
$function$;
/*
 ===============================================================================
 TOTAL REVENUE COMPUTATION
 ===============================================================================
 */
DROP FUNCTION IF EXISTS public.rpc_total_revenue(p_start_date, p_end_date);
CREATE OR REPLACE FUNCTION public.rpc_total_revenue(p_start_date date, p_end_date date) RETURNS numeric LANGUAGE sql STABLE AS $function$
select coalesce(sum(p.amount), 0)
from payments p
    join bills b on b.id = p.bill_id
where p.status = 'confirmed'
    and b.status != 'void'
    and date(p.created_at) between p_start_date and p_end_date;
$function$;
CREATE OR REPLACE FUNCTION public.set_inventory_receipt_item_total() RETURNS trigger LANGUAGE plpgsql AS $function$ begin new.line_total := coalesce(new.quantity, 0) * coalesce(new.unit_cost, 0);
return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $function$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.validate_account_hierarchy() RETURNS trigger LANGUAGE plpgsql AS $function$ begin if new.parent_id is not null then if not exists (
        select 1
        from chart_of_accounts p
        where p.id = new.parent_id
            and p.account_class = new.account_class
    ) then raise exception 'Parent account must be of the same account_class';
end if;
end if;
return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.validate_expense_account() RETURNS trigger LANGUAGE plpgsql AS $function$ begin if new.account_id is not null
    and not exists (
        select 1
        from chart_of_accounts
        where id = new.account_id
            and account_class = 'expense'
            and active = true
    ) then raise exception 'Expenses must use an active expense account';
end if;
return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.validate_journal_balance() RETURNS trigger LANGUAGE plpgsql AS $function$
declare total_debit numeric;
total_credit numeric;
begin
select sum(debit),
    sum(credit) into total_debit,
    total_credit
from journal_lines
where journal_entry_id = new.journal_entry_id;
if total_debit <> total_credit then raise exception 'Journal entry is not balanced';
end if;
return new;
end;
$function$;
CREATE OR REPLACE FUNCTION public.validate_revenue_account() RETURNS trigger LANGUAGE plpgsql AS $function$ begin if not exists (
        select 1
        from chart_of_accounts
        where id = new.revenue_account_id
            and account_class = 'income'
            and active = true
    ) then raise exception 'Sales must post to an active revenue account';
end if;
return new;
end;
$function$;
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
CREATE OR REPLACE FUNCTION public.post_bill_inventory_and_cogs() RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE r RECORD;
BEGIN -- Only act on transition to completed
IF OLD.status <> 'completed'
AND NEW.status = 'completed' THEN FOR r IN
SELECT ri.*
FROM rounds ro
    JOIN round_items ri ON ri.round_id = ro.id
WHERE ro.bill_id = NEW.id
    AND ri.inventory_posted = false LOOP -- This calls your existing sale/COGS logic
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
$function$;
CREATE OR REPLACE FUNCTION public.post_sale_cogs_for_item(
        p_product_id uuid,
        p_quantity numeric,
        p_reference_id uuid
    ) RETURNS void LANGUAGE plpgsql AS $function$
DECLARE v_avg_cost NUMERIC := 0;
--Default to zero upfront
v_total_cost NUMERIC;
v_inventory_account UUID;
v_cogs_account UUID;
v_journal_id UUID;
BEGIN -- Get AVG cost (default to 0 if not found)
SELECT COALESCE(avg_unit_cost, 0) INTO v_avg_cost
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
        - p_quantity,
        v_avg_cost,
        'sale',
        'sale_backfill',
        p_reference_id,
        CASE
            WHEN v_avg_cost = 0 THEN 'Backfilled sale (ZERO COST)'
            ELSE 'Backfilled sale'
        END
    );
-- Get GL accounts
SELECT inventory_account_id,
    cogs_account_id INTO v_inventory_account,
    v_cogs_account
FROM inventory_items
WHERE product_id = p_product_id;
-- Skip GL posting if accounts missing OR zero-value transaction
IF v_inventory_account IS NULL
OR v_cogs_account IS NULL
OR v_total_cost = 0 THEN RETURN;
-- Silent exit - no error, no journal entry
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
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
VALUES (v_journal_id, v_cogs_account, v_total_cost, 0);
-- Cr Inventory
INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
VALUES (
        v_journal_id,
        v_inventory_account,
        0,
        v_total_cost
    );
END;
$function$;
/*
 ============================================================================
 PERFORMANCE COMPARISON FUNCTIONS
 ----------------------------------------------------------------------------
 These functions provide performance analytics for weekly, monthly, and
 weekend vs weekday comparisons
 Created: 16/02/2026 - einbulinda
 ============================================================================
 */
-- Weekly Performance Comparison
CREATE OR REPLACE FUNCTION public.rpc_weekly_performance(p_start_date date, p_end_date date) RETURNS TABLE(
        week_start date,
        week_end date,
        week_number integer,
        total_revenue numeric,
        total_bills integer,
        avg_bill_value numeric,
        total_transactions integer
    ) LANGUAGE sql STABLE AS $function$ WITH weekly_data AS (
        SELECT DATE_TRUNC('week', p.created_at)::date AS week_start,
            (
                DATE_TRUNC('week', p.created_at) + INTERVAL '6 days'
            )::date AS week_end,
            EXTRACT(
                WEEK
                FROM p.created_at
            )::integer AS week_number,
            SUM(p.amount) AS total_revenue,
            COUNT(DISTINCT p.bill_id) AS total_bills,
            AVG(bt.total) AS avg_bill_value,
            COUNT(*) AS total_transactions
        FROM payments p
            JOIN bills b ON b.id = p.bill_id
            JOIN v_bill_totals bt ON bt.bill_id = b.id
        WHERE p.is_paid = true
            AND DATE(p.created_at) BETWEEN p_start_date AND p_end_date
            AND b.status = 'completed'
        GROUP BY DATE_TRUNC('week', p.created_at),
            EXTRACT(
                WEEK
                FROM p.created_at
            )
    )
SELECT week_start,
    week_end,
    week_number,
    COALESCE(total_revenue, 0) AS total_revenue,
    COALESCE(total_bills, 0) AS total_bills,
    COALESCE(avg_bill_value, 0) AS avg_bill_value,
    COALESCE(total_transactions, 0) AS total_transactions
FROM weekly_data
ORDER BY week_start;
$function$;
-- Monthly Performance Comparison
CREATE OR REPLACE FUNCTION public.rpc_monthly_performance(p_start_date date, p_end_date date) RETURNS TABLE(
        month_start date,
        month_end date,
        month_name text,
        year integer,
        total_revenue numeric,
        total_bills integer,
        avg_bill_value numeric,
        total_transactions integer,
        unique_customers integer
    ) LANGUAGE sql STABLE AS $function$ WITH monthly_data AS (
        SELECT DATE_TRUNC('month', p.created_at)::date AS month_start,
            (
                DATE_TRUNC('month', p.created_at) + INTERVAL '1 month' - INTERVAL '1 day'
            )::date AS month_end,
            TO_CHAR(p.created_at, 'Month') AS month_name,
            EXTRACT(
                YEAR
                FROM p.created_at
            )::integer AS year,
            SUM(p.amount) AS total_revenue,
            COUNT(DISTINCT p.bill_id) AS total_bills,
            AVG(bt.total) AS avg_bill_value,
            COUNT(*) AS total_transactions,
            COUNT(DISTINCT LOWER(TRIM(b.customer_name))) FILTER (
                WHERE b.customer_name IS NOT NULL
                    AND b.customer_name != ''
            ) AS unique_customers
        FROM payments p
            JOIN bills b ON b.id = p.bill_id
            JOIN v_bill_totals bt ON bt.bill_id = b.id
        WHERE p.is_paid = true
            AND DATE(p.created_at) BETWEEN p_start_date AND p_end_date
            AND b.status = 'completed'
        GROUP BY DATE_TRUNC('month', p.created_at),
            TO_CHAR(p.created_at, 'Month'),
            EXTRACT(
                YEAR
                FROM p.created_at
            )
    )
SELECT month_start,
    month_end,
    TRIM(month_name) AS month_name,
    year,
    COALESCE(total_revenue, 0) AS total_revenue,
    COALESCE(total_bills, 0) AS total_bills,
    COALESCE(avg_bill_value, 0) AS avg_bill_value,
    COALESCE(total_transactions, 0) AS total_transactions,
    COALESCE(unique_customers, 0) AS unique_customers
FROM monthly_data
ORDER BY month_start;
$function$;
-- Weekend vs Weekday Performance
CREATE OR REPLACE FUNCTION public.rpc_weekend_weekday_performance(p_start_date date, p_end_date date) RETURNS TABLE(
        period_type text,
        total_revenue numeric,
        total_bills integer,
        avg_bill_value numeric,
        total_transactions integer,
        revenue_percentage numeric
    ) LANGUAGE sql STABLE AS $function$ WITH day_classification AS (
        SELECT p.amount,
            p.bill_id,
            bt.total,
            CASE
                WHEN EXTRACT(
                    DOW
                    FROM p.created_at
                ) IN (0, 6) THEN 'Weekend'
                ELSE 'Weekday'
            END AS period_type
        FROM payments p
            JOIN bills b ON b.id = p.bill_id
            JOIN v_bill_totals bt ON bt.bill_id = b.id
        WHERE p.is_paid = true
            AND DATE(p.created_at) BETWEEN p_start_date AND p_end_date
            AND b.status = 'completed'
    ),
    period_totals AS (
        SELECT period_type,
            SUM(amount) AS total_revenue,
            COUNT(DISTINCT bill_id) AS total_bills,
            AVG(total) AS avg_bill_value,
            COUNT(*) AS total_transactions
        FROM day_classification
        GROUP BY period_type
    ),
    grand_total AS (
        SELECT SUM(total_revenue) AS total
        FROM period_totals
    )
SELECT pt.period_type,
    COALESCE(pt.total_revenue, 0) AS total_revenue,
    COALESCE(pt.total_bills, 0) AS total_bills,
    COALESCE(pt.avg_bill_value, 0) AS avg_bill_value,
    COALESCE(pt.total_transactions, 0) AS total_transactions,
    CASE
        WHEN gt.total > 0 THEN ROUND((pt.total_revenue / gt.total * 100), 2)
        ELSE 0
    END AS revenue_percentage
FROM period_totals pt
    CROSS JOIN grand_total gt
ORDER BY pt.period_type DESC;
-- Weekend first, then Weekday
$function$;
-- Day of Week Performance
CREATE OR REPLACE FUNCTION public.rpc_day_of_week_performance(p_start_date date, p_end_date date) RETURNS TABLE(
        day_of_week integer,
        day_name text,
        total_revenue numeric,
        total_bills integer,
        avg_bill_value numeric,
        total_transactions integer
    ) LANGUAGE sql STABLE AS $function$ WITH dow_data AS (
        SELECT EXTRACT(
                DOW
                FROM p.created_at
            )::integer AS day_of_week,
            TO_CHAR(p.created_at, 'Day') AS day_name,
            SUM(p.amount) AS total_revenue,
            COUNT(DISTINCT p.bill_id) AS total_bills,
            AVG(bt.total) AS avg_bill_value,
            COUNT(*) AS total_transactions
        FROM payments p
            JOIN bills b ON b.id = p.bill_id
            JOIN v_bill_totals bt ON bt.bill_id = b.id
        WHERE p.is_paid = true
            AND DATE(p.created_at) BETWEEN p_start_date AND p_end_date
            AND b.status = 'completed'
        GROUP BY EXTRACT(
                DOW
                FROM p.created_at
            ),
            TO_CHAR(p.created_at, 'Day')
    )
SELECT day_of_week,
    TRIM(day_name) AS day_name,
    COALESCE(total_revenue, 0) AS total_revenue,
    COALESCE(total_bills, 0) AS total_bills,
    COALESCE(avg_bill_value, 0) AS avg_bill_value,
    COALESCE(total_transactions, 0) AS total_transactions
FROM dow_data
ORDER BY day_of_week;
$function$;
-- Daily Sales Breakdown by Category (for stacked bar chart)
CREATE OR REPLACE FUNCTION public.rpc_daily_category_breakdown(p_start_date date, p_end_date date) RETURNS TABLE(
        sale_date date,
        category_id uuid,
        category_name character varying,
        category_sales numeric,
        category_quantity integer
    ) LANGUAGE sql STABLE AS $function$
SELECT DATE(pm.created_at) AS sale_date,
    c.id AS category_id,
    c.name AS category_name,
    SUM(ri.price * ri.quantity) AS category_sales,
    SUM(ri.quantity)::integer AS category_quantity
FROM payments pm
    JOIN bills b ON b.id = pm.bill_id
    JOIN rounds r ON r.bill_id = b.id
    JOIN round_items ri ON ri.round_id = r.id
    JOIN products p ON p.id = ri.product_id
    JOIN categories c ON c.id = p.category_id
WHERE pm.is_paid = true
    AND DATE(pm.created_at) BETWEEN p_start_date AND p_end_date
    AND b.status = 'completed'
GROUP BY DATE(pm.created_at),
    c.id,
    c.name
ORDER BY sale_date,
    category_name;
$function$;
/*
 ============================================================================
 TOP SELLING PRODUCTS REPORT
 This function identifies the top 10 best-selling products based on total sales amount within a specified date range. It aggregates data across multiple tables to ensure accurate results based on completed and paid transactions.
 Updated: 16/02/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.rpc_top_selling_products(p_start_date date, p_end_date date) RETURNS TABLE(
        product_id uuid,
        product_name character varying,
        category_name character varying,
        total_quantity integer,
        total_sales numeric,
        total_orders bigint
    ) LANGUAGE sql STABLE AS $function$
SELECT p.id AS product_id,
    p.name AS product_name,
    c.name AS category_name,
    SUM(ri.quantity)::integer AS total_quantity,
    SUM(ri.price * ri.quantity) AS total_sales,
    COUNT(DISTINCT b.id) AS total_orders
FROM round_items ri
    JOIN rounds r ON r.id = ri.round_id
    JOIN bills b ON b.id = r.bill_id
    JOIN payments pm ON pm.bill_id = b.id
    JOIN products p ON p.id = ri.product_id
    LEFT JOIN categories c ON c.id = p.category_id
WHERE b.status = 'completed'
    AND pm.is_paid = true
    AND DATE(pm.created_at) BETWEEN p_start_date AND p_end_date
GROUP BY p.id,
    p.name,
    c.name
ORDER BY total_sales DESC
LIMIT 10;
$function$;
/*=======================================================================
 BILL STATUS SUMMARY
 This function provides a summary of bill counts by status within a specified date range. It is useful for monitoring the distribution of bills across different statuses (e.g., pending, completed, under_review) and can help identify bottlenecks in the billing process.
 Updated: 16/02/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.rpc_bill_status_summary(p_start_date date, p_end_date date) RETURNS TABLE(status text, count bigint) LANGUAGE sql STABLE AS $function$
SELECT b.status::text,
    COUNT(*) AS count
FROM bills b
WHERE DATE(b.created_at) BETWEEN p_start_date AND p_end_date
GROUP BY b.status
ORDER BY count DESC;
$function$;
/*=======================================================================
 ACCOUNT LEDGER
 Returns journal lines for a given account with a running balance,
 ordered by entry date. Used by the General Ledger page in the ERP.
 Created: 18/02/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.rpc_account_ledger(
        p_account_id uuid,
        p_start_date date,
        p_end_date date
    ) RETURNS TABLE (
        entry_date date,
        reference text,
        description text,
        debit numeric,
        credit numeric,
        running_balance numeric
    ) LANGUAGE sql STABLE AS $function$
SELECT je.entry_date,
    je.reference,
    COALESCE(je.description, ''),
    jl.debit,
    jl.credit,
    SUM(jl.debit - jl.credit) OVER (
        ORDER BY je.entry_date,
            je.id
    ) AS running_balance
FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE jl.account_id = p_account_id
    AND je.entry_date BETWEEN p_start_date AND p_end_date
ORDER BY je.entry_date,
    je.id;
$function$;
/*
 ============================================================================
 TRIGGERS
 ----------------------------------------------------------------------------
 These triggers automatically maintain data integrity and enforce business rules
 across various tables. They handle tasks such as updating timestamps, validating
 account references, posting inventory movements, and ensuring journal entries are balanced.
 Updated: 16/02/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.validate_expense_account() RETURNS trigger LANGUAGE plpgsql AS $function$ BEGIN IF new.account_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1
        FROM chart_of_accounts
        WHERE id = new.account_id
            AND account_class = 'expense'
            AND active = true
    ) THEN RAISE EXCEPTION 'Expenses must use an active expense account';
END IF;
RETURN new;
END;
$function$;
/*=======================================================================
 RPC_SUPPLIER_STATEMENT
 Returns a running statement for a supplier by unioning inventory_receipts
 (goods purchased), expenses (non-inventory supplier charges), and
 supplier_payments (amounts paid). Includes a cumulative running balance
 (positive = supplier is owed money, negative = in credit).
 Created: 19/02/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.rpc_supplier_statement(
        p_supplier_id uuid,
        p_start_date date DEFAULT NULL,
        p_end_date date DEFAULT NULL
    ) RETURNS TABLE(
        txn_date date,
        txn_type text,
        reference text,
        description text,
        debit numeric,
        credit numeric,
        running_balance numeric
    ) LANGUAGE sql STABLE AS $function$ WITH txns AS (
        -- Inventory receipts (goods purchased from supplier)
        SELECT ir.purchase_date AS txn_date,
            'purchase'::text AS txn_type,
            ir.invoice_number AS reference,
            COALESCE(ir.notes, 'Inventory purchase') AS description,
            ir.total_amount AS debit,
            0::numeric AS credit
        FROM inventory_receipts ir
        WHERE ir.supplier_id = p_supplier_id
            AND (
                p_start_date IS NULL
                OR ir.purchase_date >= p_start_date
            )
            AND (
                p_end_date IS NULL
                OR ir.purchase_date <= p_end_date
            )
        UNION ALL
        -- Expenses linked to this supplier (non-inventory charges)
        SELECT e.expense_date AS txn_date,
            'expense'::text AS txn_type,
            COALESCE(e.invoice_number, 'EXP') AS reference,
            COALESCE(e.description, 'Supplier expense') AS description,
            e.amount AS debit,
            0::numeric AS credit
        FROM expenses e
        WHERE e.supplier_id = p_supplier_id
            AND (
                p_start_date IS NULL
                OR e.expense_date >= p_start_date
            )
            AND (
                p_end_date IS NULL
                OR e.expense_date <= p_end_date
            )
        UNION ALL
        -- Payments made to supplier
        SELECT sp.payment_date AS txn_date,
            'payment'::text AS txn_type,
            COALESCE(sp.reference, 'PMT') AS reference,
            COALESCE(sp.notes, 'Payment') AS description,
            0::numeric AS debit,
            sp.amount AS credit
        FROM supplier_payments sp
        WHERE sp.supplier_id = p_supplier_id
            AND (
                p_start_date IS NULL
                OR sp.payment_date >= p_start_date
            )
            AND (
                p_end_date IS NULL
                OR sp.payment_date <= p_end_date
            )
    )
SELECT txn_date,
    txn_type,
    reference,
    description,
    debit,
    credit,
    SUM(debit - credit) OVER (
        ORDER BY txn_date,
            txn_type
    ) AS running_balance
FROM txns
ORDER BY txn_date,
    txn_type;
$function$;
/*
 ============================================================================
 PAYROLL PROCESSING FUNCTION
 ----------------------------------------------------------------------------
 Processes a monthly payroll run as a single atomic transaction. All five
 steps — computing employee pay, inserting the payroll run, creating run
 lines, posting the GL journal entry, and linking the journal back to the
 run — execute inside one implicit PL/pgSQL transaction. Any failure at
 any step rolls back the entire operation, preventing orphaned records.
 
 GL posting:
 Dr  salary_account_id   (Salary Expense)   = total gross pay
 Cr  payable_account_id  (Salaries Payable)  = total gross pay
 
 Raises: NO_EMPLOYEES_WITH_SALARY_STRUCTURES when no profiles have a
 linked salary structure.
 
 Returns: JSON row of the created payroll_run record.
 
 Created: 20/02/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.rpc_process_payroll_run(
        p_period date,
        p_salary_account_id uuid,
        p_payable_account_id uuid,
        p_notes text,
        p_created_by uuid
    ) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_run_id uuid;
v_journal_entry_id uuid;
v_total_gross numeric := 0;
v_total_deductions numeric := 0;
v_total_net numeric := 0;
v_employee_count integer := 0;
v_month_name text;
v_emp record;
v_gross numeric;
v_deductions numeric;
v_net numeric;
BEGIN -- Human-readable month label for journal descriptions
v_month_name := to_char(p_period, 'Month YYYY');
-- Pass 1: compute totals only (no inserts yet — run_id doesn't exist yet)
FOR v_emp IN
SELECT p.id AS profile_id,
    s.basic_pay,
    s.housing_allowance,
    s.transport_allowance,
    s.other_allowances,
    s.paye,
    s.nssf,
    s.shif,
    s.housing_levy,
    s.other_deductions,
    s.payment_method,
    s.full_name,
    s.id_number,
    s.mpesa_number
FROM profiles p
    JOIN employee_salary_structures s ON s.profile_id = p.id LOOP v_gross := coalesce(v_emp.basic_pay, 0) + coalesce(v_emp.housing_allowance, 0) + coalesce(v_emp.transport_allowance, 0) + coalesce(v_emp.other_allowances, 0);
v_deductions := coalesce(v_emp.paye, 0) + coalesce(v_emp.nssf, 0) + coalesce(v_emp.shif, 0) + coalesce(v_emp.housing_levy, 0) + coalesce(v_emp.other_deductions, 0);
v_total_gross := v_total_gross + v_gross;
v_total_deductions := v_total_deductions + v_deductions;
v_total_net := v_total_net + (v_gross - v_deductions);
v_employee_count := v_employee_count + 1;
END LOOP;
IF v_employee_count = 0 THEN RAISE EXCEPTION 'NO_EMPLOYEES_WITH_SALARY_STRUCTURES';
END IF;
-- Create the payroll run header now that totals are known
INSERT INTO payroll_runs (
        period,
        salary_account_id,
        payable_account_id,
        notes,
        status,
        total_gross,
        total_deductions,
        total_net,
        employee_count,
        created_by,
        processed_at
    )
VALUES (
        p_period,
        p_salary_account_id,
        p_payable_account_id,
        p_notes,
        'processed',
        v_total_gross,
        v_total_deductions,
        v_total_net,
        v_employee_count,
        p_created_by,
        now()
    )
RETURNING id INTO v_run_id;
-- Pass 2: insert run lines now that v_run_id satisfies the FK constraint
FOR v_emp IN
SELECT p.id AS profile_id,
    s.basic_pay,
    s.housing_allowance,
    s.transport_allowance,
    s.other_allowances,
    s.paye,
    s.nssf,
    s.shif,
    s.housing_levy,
    s.other_deductions,
    s.payment_method,
    s.full_name,
    s.id_number,
    s.mpesa_number
FROM profiles p
    JOIN employee_salary_structures s ON s.profile_id = p.id LOOP v_gross := coalesce(v_emp.basic_pay, 0) + coalesce(v_emp.housing_allowance, 0) + coalesce(v_emp.transport_allowance, 0) + coalesce(v_emp.other_allowances, 0);
v_deductions := coalesce(v_emp.paye, 0) + coalesce(v_emp.nssf, 0) + coalesce(v_emp.shif, 0) + coalesce(v_emp.housing_levy, 0) + coalesce(v_emp.other_deductions, 0);
v_net := v_gross - v_deductions;
INSERT INTO payroll_run_lines (
        run_id,
        profile_id,
        basic_pay,
        housing_allowance,
        transport_allowance,
        other_allowances,
        gross_pay,
        paye,
        nssf,
        shif,
        housing_levy,
        other_deductions,
        total_deductions,
        net_pay,
        payment_method,
        full_name,
        id_number,
        mpesa_number
    )
VALUES (
        v_run_id,
        v_emp.profile_id,
        v_emp.basic_pay,
        coalesce(v_emp.housing_allowance, 0),
        coalesce(v_emp.transport_allowance, 0),
        coalesce(v_emp.other_allowances, 0),
        v_gross,
        coalesce(v_emp.paye, 0),
        coalesce(v_emp.nssf, 0),
        coalesce(v_emp.shif, 0),
        coalesce(v_emp.housing_levy, 0),
        coalesce(v_emp.other_deductions, 0),
        v_deductions,
        v_net,
        coalesce(v_emp.payment_method, 'cash'),
        v_emp.full_name,
        v_emp.id_number,
        v_emp.mpesa_number
    );
END LOOP;
-- Post GL journal entry: Dr Salary Expense / Cr Salaries Payable
INSERT INTO journal_entries (entry_date, description, source_type, source_id)
VALUES (
        p_period,
        'Payroll – ' || v_month_name,
        'payroll',
        v_run_id
    )
RETURNING id INTO v_journal_entry_id;
INSERT INTO journal_lines (
        journal_entry_id,
        account_id,
        debit,
        credit,
        description
    )
VALUES (
        v_journal_entry_id,
        p_salary_account_id,
        v_total_gross,
        0,
        'Salary expense – ' || v_month_name
    ),
    (
        v_journal_entry_id,
        p_payable_account_id,
        0,
        v_total_gross,
        'Salaries payable – ' || v_month_name
    );
-- Link the journal entry back to the payroll run
UPDATE payroll_runs
SET journal_entry_id = v_journal_entry_id
WHERE id = v_run_id;
RETURN (
    SELECT row_to_json(r)
    FROM payroll_runs r
    WHERE r.id = v_run_id
);
END;
$function$;
/*
 ============================================================================
 RECEIVE INVENTORY FUNCTION
 ----------------------------------------------------------------------------
 This function processes the receipt of inventory from a supplier. It performs
 the following steps within a single transaction:
 1. Validates input parameters.
 2. Creates a new inventory receipt record.
 3. Loops through each line item in the provided JSON array, inserting receipt items and corresponding inventory movements.
 4. Returns the ID of the created receipt for reference.
 
 Raises exceptions for missing required fields or invalid data, ensuring that no partial data is saved if any step fails.
 Created: 21/02/2026 - einbulinda
 ============================================================================
 */
create or replace function public.receive_inventory(
        p_supplier_id uuid,
        p_invoice_number text,
        p_purchase_date date,
        p_total_amount numeric,
        p_created_by uuid,
        p_line_items jsonb
    ) returns uuid language plpgsql as $$
declare v_receipt_id uuid;
v_item jsonb;
v_product_id uuid;
v_quantity numeric;
v_unit_cost numeric;
v_line_total numeric;
begin -- ========= VALIDATIONS =========
if p_supplier_id is null then raise exception 'SUPPLIER_REQUIRED';
end if;
if p_invoice_number is null then raise exception 'INVOICE_NUMBER_REQUIRED';
end if;
if p_purchase_date is null then raise exception 'PURCHASE_DATE_REQUIRED';
end if;
if jsonb_array_length(p_line_items) = 0 then raise exception 'RECEIPT_ITEMS_REQUIRED';
end if;
-- ========= 1. CREATE RECEIPT =========
insert into inventory_receipts (
        supplier_id,
        invoice_number,
        purchase_date,
        total_amount,
        created_by
    )
values (
        p_supplier_id,
        p_invoice_number,
        p_purchase_date,
        p_total_amount,
        p_created_by
    )
returning id into v_receipt_id;
-- ========= 2. LOOP LINE ITEMS =========
for v_item in
select *
from jsonb_array_elements(p_line_items) loop v_product_id := (v_item->>'product_id')::uuid;
v_quantity := (v_item->>'quantity')::numeric;
v_unit_cost := (v_item->>'unit_cost')::numeric;
v_line_total := (v_item->>'line_total')::numeric;
-- Insert receipt item
insert into inventory_receipt_items (
        receipt_id,
        product_id,
        quantity,
        unit_cost,
        line_total
    )
values (
        v_receipt_id,
        v_product_id,
        v_quantity,
        v_unit_cost,
        v_line_total
    );
-- Insert inventory movement (purchase)
/* 
 22.02.2026 @1353 : A trigger on the inventory_receipt_items exists for handling this.
 
 insert into inventory_movements (
 product_id,
 movement_date,
 quantity,
 movement_type,
 reference_type,
 reference_id,
 notes,
 unit_cost
 )
 values (
 v_product_id,
 p_purchase_date,
 v_quantity,
 'purchase',
 'receipt',
 v_receipt_id,
 'Receipt ' || p_invoice_number,
 v_unit_cost
 );
 */
end loop;
return v_receipt_id;
exception
when others then raise;
-- forces rollback
end;
$$;
/*
 ============================================================================
 UPDATE PRODUCT QUANTITY TRIGGER FUNCTION
 ----------------------------------------------------------------------------
 This trigger function automatically updates the current stock quantity of a product whenever an inventory movement is inserted, updated, or deleted. It calculates the on-hand quantity by summing all related inventory movements for the affected product and ensures that the current stock level is always accurate and non-negative.
 Updated: 23/02/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION update_product_quantity() RETURNS TRIGGER AS $$ BEGIN -- Update the product's on-hand quantity
UPDATE products
SET current_stock = GREATEST(
        COALESCE(
            (
                SELECT SUM(quantity)
                FROM inventory_movements
                WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
            ),
            0
        ),
        0
    )
WHERE id = COALESCE(NEW.product_id, OLD.product_id);
RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
/*
 ============================================================================
 UNIFIED EXPENSES VIEW
 Returns all expense activity from two sources:
 1. Direct expenses (from the expenses table)
 2. Journal lines hitting expense-class accounts (from cheques, manual journals, etc.)
 Excludes journal lines with source_type='expense' to avoid double-counting.
 Created: 24/02/2026 - claude
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.rpc_unified_expenses(
        p_start_date date DEFAULT NULL,
        p_end_date date DEFAULT NULL
    ) RETURNS TABLE(
        id uuid,
        txn_date date,
        account_name varchar,
        account_code varchar,
        account_id uuid,
        parent_id uuid,
        supplier_name varchar,
        credit_account_name varchar,
        description text,
        invoice_number varchar,
        amount numeric,
        source text,
        journal_entry_id uuid
    ) LANGUAGE plpgsql AS $function$ BEGIN RETURN QUERY -- Direct expenses
SELECT e.id,
    e.expense_date AS txn_date,
    coa.name::varchar AS account_name,
    coa.code::varchar AS account_code,
    e.account_id,
    coa.parent_id,
    s.name::varchar AS supplier_name,
    cr.name::varchar AS credit_account_name,
    e.description,
    e.invoice_number::varchar,
    e.amount,
    'expense'::text AS source,
    e.journal_entry_id
FROM expenses e
    JOIN chart_of_accounts coa ON e.account_id = coa.id
    LEFT JOIN suppliers s ON e.supplier_id = s.id
    LEFT JOIN chart_of_accounts cr ON e.credit_account_id = cr.id
WHERE (
        p_start_date IS NULL
        OR e.expense_date >= p_start_date
    )
    AND (
        p_end_date IS NULL
        OR e.expense_date <= p_end_date
    )
UNION ALL
-- Journal lines hitting expense accounts (excluding expense-sourced journals)
SELECT jl.id,
    je.entry_date AS txn_date,
    coa.name::varchar AS account_name,
    coa.code::varchar AS account_code,
    jl.account_id,
    coa.parent_id,
    NULL::varchar AS supplier_name,
    NULL::varchar AS credit_account_name,
    COALESCE(jl.description, je.description) AS description,
    je.reference::varchar AS invoice_number,
    jl.debit AS amount,
    je.source_type::text AS source,
    je.id AS journal_entry_id
FROM journal_lines jl
    JOIN chart_of_accounts coa ON jl.account_id = coa.id
    JOIN journal_entries je ON jl.journal_entry_id = je.id
WHERE coa.account_class = 'expense'
    AND jl.debit > 0
    AND je.source_type != 'expense'
    AND je.reversed_entry_id IS NULL
    AND (
        p_start_date IS NULL
        OR je.entry_date >= p_start_date
    )
    AND (
        p_end_date IS NULL
        OR je.entry_date <= p_end_date
    )
ORDER BY txn_date DESC;
END;
$function$;
/*
 ============================================================================
 BALANCE SHEET RPC
 ----------------------------------------------------------------------------
 Returns account balances as of a given date for balance sheet rendering.
 Groups by account class (asset, liability, equity). Sign is flipped for
 credit-normal accounts so balances display as positive.
 Also returns a synthetic 'Retained Earnings' row computed from income,
 expense, and cost_of_sales accounts.
 Created: 23/02/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.rpc_balance_sheet(p_as_of_date date) RETURNS TABLE (
        account_id uuid,
        account_code varchar,
        account_name varchar,
        account_class varchar,
        parent_id uuid,
        normal_balance varchar,
        is_control_account boolean,
        balance numeric
    ) LANGUAGE sql STABLE AS $function$ -- Balance sheet accounts (asset, liability, equity)
SELECT coa.id AS account_id,
    coa.code AS account_code,
    coa.name AS account_name,
    coa.account_class,
    coa.parent_id,
    coa.normal_balance,
    coa.is_control_account,
    CASE
        WHEN coa.normal_balance = 'credit' THEN COALESCE(SUM(jl.credit - jl.debit), 0)
        ELSE COALESCE(SUM(jl.debit - jl.credit), 0)
    END AS balance
FROM chart_of_accounts coa
    LEFT JOIN (
        journal_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id
        AND je.entry_date <= p_as_of_date
    ) ON jl.account_id = coa.id
WHERE coa.account_class IN (
        'asset',
        'current_asset',
        'non_current_asset',
        'bank',
        'liability',
        'current_liability',
        'non_current_liability',
        'equity'
    )
    AND coa.active = true
GROUP BY coa.id,
    coa.code,
    coa.name,
    coa.account_class,
    coa.parent_id,
    coa.normal_balance,
    coa.is_control_account
HAVING COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) != 0
    OR coa.parent_id IS NULL
    OR coa.is_control_account = true
ORDER BY coa.code;
$function$;
-- Returns net income (revenue - expenses - COGS) up to a given date
CREATE OR REPLACE FUNCTION public.rpc_net_income(p_as_of_date date) RETURNS numeric LANGUAGE sql STABLE AS $function$
SELECT COALESCE(
        SUM(
            CASE
                WHEN coa.account_class = 'income' THEN jl.credit - jl.debit
                WHEN coa.account_class IN (
                    'expense',
                    'cost_of_sales',
                    'finance_cost',
                    'admin_cost',
                    'operating_cost'
                ) THEN jl.debit - jl.credit
                ELSE 0
            END
        ),
        0
    ) AS net_income
FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    JOIN chart_of_accounts coa ON coa.id = jl.account_id
WHERE je.entry_date <= p_as_of_date
    AND coa.account_class IN (
        'income',
        'expense',
        'cost_of_sales',
        'finance_cost',
        'admin_cost',
        'operating_cost'
    )
    AND coa.active = true;
$function$;
-- Returns trial balance for a date range: debit and credit totals per account
CREATE OR REPLACE FUNCTION public.rpc_trial_balance(p_start_date date, p_end_date date) RETURNS TABLE (
        account_id uuid,
        account_code varchar,
        account_name varchar,
        account_class varchar,
        parent_id uuid,
        normal_balance varchar,
        is_control_account boolean,
        total_debit numeric,
        total_credit numeric,
        balance numeric
    ) LANGUAGE sql STABLE AS $function$
SELECT coa.id AS account_id,
    coa.code AS account_code,
    coa.name AS account_name,
    coa.account_class,
    coa.parent_id,
    coa.normal_balance,
    coa.is_control_account,
    COALESCE(SUM(jl.debit), 0) AS total_debit,
    COALESCE(SUM(jl.credit), 0) AS total_credit,
    CASE
        WHEN coa.normal_balance = 'credit' THEN COALESCE(SUM(jl.credit - jl.debit), 0)
        ELSE COALESCE(SUM(jl.debit - jl.credit), 0)
    END AS balance
FROM chart_of_accounts coa
    LEFT JOIN (
        journal_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id
        AND je.entry_date >= p_start_date
        AND je.entry_date <= p_end_date
    ) ON jl.account_id = coa.id
WHERE coa.active = true
GROUP BY coa.id,
    coa.code,
    coa.name,
    coa.account_class,
    coa.parent_id,
    coa.normal_balance,
    coa.is_control_account
HAVING COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) != 0
ORDER BY coa.code;
$function$;
/*
 ============================================================================
 INCOME STATEMENT RPC
 ----------------------------------------------------------------------------
 Returns income statement line items for a date range (income, cost_of_sales, expense)
 Created: 02/03/2026 - einbulinda
 ============================================================================
 */
-- Returns income statement line items for a date range (income, cost_of_sales, expense)
CREATE OR REPLACE FUNCTION public.rpc_income_statement(p_start_date date, p_end_date date) RETURNS TABLE (
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
DECLARE v_cos_parent_id UUID;
v_opening_inventory NUMERIC;
v_closing_inventory NUMERIC;
v_5002_balance NUMERIC;
BEGIN
SELECT id INTO v_cos_parent_id
FROM chart_of_accounts
WHERE code = '5000';
/* Manual opening balance posted to 5002 (DR 5002 / CR Bank)
 never hit inventory asset accounts, so fold it in here. */
SELECT COALESCE(SUM(jl.debit - jl.credit), 0) INTO v_5002_balance
FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE jl.account_id = (
        SELECT id
        FROM chart_of_accounts
        WHERE code = '5002'
    );
SELECT COALESCE(SUM(jl.debit - jl.credit), 0) + v_5002_balance INTO v_opening_inventory
FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE jl.account_id IN (
        SELECT DISTINCT inventory_account_id
        FROM inventory_items
    )
    AND je.entry_date < p_start_date;
SELECT COALESCE(SUM(jl.debit - jl.credit), 0) + v_5002_balance INTO v_closing_inventory
FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE jl.account_id IN (
        SELECT DISTINCT inventory_account_id
        FROM inventory_items
    )
    AND je.entry_date <= p_end_date;
RETURN QUERY
SELECT coa.id AS account_id,
    coa.code::varchar AS account_code,
    coa.name::varchar AS account_name,
    coa.account_class::varchar,
    coa.parent_id,
    coa.normal_balance::varchar,
    coa.is_control_account,
    CASE
        WHEN coa.normal_balance = 'credit' THEN COALESCE(SUM(jl.credit - jl.debit), 0)
        ELSE COALESCE(SUM(jl.debit - jl.credit), 0)
    END AS balance,
    false AS is_computed
FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
    AND je.entry_date >= p_start_date
    AND je.entry_date <= p_end_date
WHERE coa.account_class IN (
        'income',
        'cost_of_sales',
        'expense',
        'finance_cost',
        'admin_cost',
        'operating_cost'
    )
    AND coa.active = true
GROUP BY coa.id,
    coa.code,
    coa.name,
    coa.account_class,
    coa.parent_id,
    coa.normal_balance,
    coa.is_control_account
HAVING COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) != 0
    OR coa.parent_id IS NULL
    OR coa.is_control_account = true
UNION ALL
SELECT '00000000-0000-0000-0000-000000000001'::uuid,
    '5001'::varchar,
    'Opening Inventory'::varchar,
    'cost_of_sales'::varchar,
    v_cos_parent_id,
    'debit'::varchar,
    false,
    v_opening_inventory,
    true
UNION ALL
SELECT '00000000-0000-0000-0000-000000000002'::uuid,
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
/*
 ============================================================================
 CASH FLOW STATEMENT RPC
 ----------------------------------------------------------------------------
 Returns balance sheet accounts with opening balance, closing balance,
 and net change for a date range. Used by the indirect method cash flow
 statement (IAS 7) — the frontend computes Operating/Investing/Financing
 sections using net income + account balance changes.
 Created: 02/03/2026 - einbulinda
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.rpc_cash_flow_data(p_start_date date, p_end_date date) RETURNS TABLE (
        account_id uuid,
        account_code varchar,
        account_name varchar,
        account_class varchar,
        parent_id uuid,
        normal_balance varchar,
        is_control_account boolean,
        opening_balance numeric,
        closing_balance numeric,
        net_change numeric
    ) LANGUAGE sql STABLE AS $function$
SELECT coa.id AS account_id,
    coa.code AS account_code,
    coa.name AS account_name,
    coa.account_class,
    coa.parent_id,
    coa.normal_balance,
    coa.is_control_account,
    CASE
        WHEN coa.normal_balance = 'credit' THEN COALESCE(
            SUM(
                CASE
                    WHEN je.entry_date < p_start_date THEN jl.credit - jl.debit
                    ELSE 0
                END
            ),
            0
        )
        ELSE COALESCE(
            SUM(
                CASE
                    WHEN je.entry_date < p_start_date THEN jl.debit - jl.credit
                    ELSE 0
                END
            ),
            0
        )
    END AS opening_balance,
    CASE
        WHEN coa.normal_balance = 'credit' THEN COALESCE(
            SUM(
                CASE
                    WHEN je.entry_date <= p_end_date THEN jl.credit - jl.debit
                    ELSE 0
                END
            ),
            0
        )
        ELSE COALESCE(
            SUM(
                CASE
                    WHEN je.entry_date <= p_end_date THEN jl.debit - jl.credit
                    ELSE 0
                END
            ),
            0
        )
    END AS closing_balance,
    CASE
        WHEN coa.normal_balance = 'credit' THEN COALESCE(
            SUM(
                CASE
                    WHEN je.entry_date >= p_start_date
                    AND je.entry_date <= p_end_date THEN jl.credit - jl.debit
                    ELSE 0
                END
            ),
            0
        )
        ELSE COALESCE(
            SUM(
                CASE
                    WHEN je.entry_date >= p_start_date
                    AND je.entry_date <= p_end_date THEN jl.debit - jl.credit
                    ELSE 0
                END
            ),
            0
        )
    END AS net_change
FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE coa.account_class IN (
        'asset',
        'current_asset',
        'non_current_asset',
        'bank',
        'liability',
        'current_liability',
        'non_current_liability',
        'equity'
    )
    AND coa.active = true
GROUP BY coa.id,
    coa.code,
    coa.name,
    coa.account_class,
    coa.parent_id,
    coa.normal_balance,
    coa.is_control_account
HAVING COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) != 0
ORDER BY coa.code;
$function$;
/*
 ============================================================================
 STATEMENT OF CHANGES IN EQUITY (IAS 1)
 ----------------------------------------------------------------------------
 Returns equity account balances and period movements split into contributions
 (credits) and drawings (debits) for the given date range.
 ============================================================================
 */
CREATE OR REPLACE FUNCTION public.rpc_equity_changes(p_start_date date, p_end_date date) RETURNS TABLE (
        account_id uuid,
        account_code varchar,
        account_name varchar,
        parent_id uuid,
        normal_balance varchar,
        opening_balance numeric,
        closing_balance numeric,
        contributions numeric,
        drawings numeric
    ) LANGUAGE sql STABLE AS $function$
SELECT coa.id AS account_id,
    coa.code AS account_code,
    coa.name AS account_name,
    coa.parent_id,
    coa.normal_balance,
    COALESCE(
        SUM(
            CASE
                WHEN je.entry_date < p_start_date THEN jl.credit - jl.debit
                ELSE 0
            END
        ),
        0
    ) AS opening_balance,
    COALESCE(
        SUM(
            CASE
                WHEN je.entry_date <= p_end_date THEN jl.credit - jl.debit
                ELSE 0
            END
        ),
        0
    ) AS closing_balance,
    COALESCE(
        SUM(
            CASE
                WHEN je.entry_date >= p_start_date
                AND je.entry_date <= p_end_date THEN jl.credit
                ELSE 0
            END
        ),
        0
    ) AS contributions,
    COALESCE(
        SUM(
            CASE
                WHEN je.entry_date >= p_start_date
                AND je.entry_date <= p_end_date THEN jl.debit
                ELSE 0
            END
        ),
        0
    ) AS drawings
FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE coa.account_class = 'equity'
    AND coa.active = true
GROUP BY coa.id,
    coa.code,
    coa.name,
    coa.parent_id,
    coa.normal_balance
HAVING COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) != 0
ORDER BY coa.code;
$function$;
-- ============================================================
-- REORDER LEVEL (ROL) CALCULATION SYSTEM
-- ROL = (Avg Daily Demand × Lead Time) + Safety Stock
-- Safety Stock = Z × σ × √Lead Time
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_reorder_levels(
        p_product_ids UUID [] DEFAULT NULL,
        p_lookback_days INTEGER DEFAULT 90,
        p_service_level NUMERIC DEFAULT 0.95
    ) RETURNS TABLE (
        product_id UUID,
        avg_daily_demand NUMERIC,
        demand_std_dev NUMERIC,
        lead_time_days NUMERIC,
        safety_stock NUMERIC,
        reorder_level NUMERIC,
        primary_supplier_id UUID,
        source TEXT
    ) LANGUAGE plpgsql AS $$
DECLARE v_z_score NUMERIC;
v_default_lead_time INTEGER;
v_default_rol NUMERIC;
BEGIN v_z_score := CASE
    WHEN p_service_level >= 0.99 THEN 2.33
    WHEN p_service_level >= 0.975 THEN 1.96
    WHEN p_service_level >= 0.95 THEN 1.65
    WHEN p_service_level >= 0.90 THEN 1.28
    ELSE 1.04
END;
SELECT rls.default_lead_time_days,
    rls.default_reorder_level INTO v_default_lead_time,
    v_default_rol
FROM reorder_level_settings rls
LIMIT 1;
v_default_lead_time := COALESCE(v_default_lead_time, 3);
v_default_rol := COALESCE(v_default_rol, 5);
RETURN QUERY WITH target_products AS (
    SELECT p.id AS pid
    FROM products p
    WHERE p.track_inventory = true
        AND p.active = true
        AND (
            p_product_ids IS NULL
            OR p.id = ANY(p_product_ids)
        )
),
daily_sales AS (
    SELECT ri.product_id AS pid,
        DATE(r.created_at) AS sale_date,
        SUM(ri.quantity) AS daily_qty
    FROM round_items ri
        JOIN rounds r ON r.id = ri.round_id
        JOIN bills b ON b.id = r.bill_id
    WHERE b.status = 'completed'
        AND r.created_at >= (CURRENT_DATE - p_lookback_days)
        AND ri.product_id IN (
            SELECT tp.pid
            FROM target_products tp
        )
    GROUP BY ri.product_id,
        DATE(r.created_at)
),
demand_stats AS (
    SELECT ds.pid,
        COALESCE(AVG(ds.daily_qty), 0) AS avg_demand,
        COALESCE(STDDEV_POP(ds.daily_qty), 0) AS std_demand,
        COUNT(DISTINCT ds.sale_date) AS days_with_sales
    FROM daily_sales ds
    GROUP BY ds.pid
),
supplier_lookup AS (
    SELECT DISTINCT ON (iri.product_id) iri.product_id AS pid,
        ir.supplier_id,
        s.lead_time_days AS supplier_lead_time
    FROM inventory_receipt_items iri
        JOIN inventory_receipts ir ON ir.id = iri.receipt_id
        JOIN suppliers s ON s.id = ir.supplier_id
    WHERE iri.product_id IN (
            SELECT tp.pid
            FROM target_products tp
        )
    ORDER BY iri.product_id,
        ir.purchase_date DESC
)
SELECT tp.pid AS product_id,
    ROUND(COALESCE(dms.avg_demand, 0)::NUMERIC, 4) AS avg_daily_demand,
    ROUND(COALESCE(dms.std_demand, 0)::NUMERIC, 4) AS demand_std_dev,
    COALESCE(sl.supplier_lead_time, v_default_lead_time)::NUMERIC AS lead_time_days,
    ROUND(
        (
            v_z_score * COALESCE(dms.std_demand, 0) * SQRT(
                COALESCE(sl.supplier_lead_time, v_default_lead_time)::NUMERIC
            )
        )::NUMERIC,
        2
    ) AS safety_stock,
    GREATEST(
        ROUND(
            (
                (
                    COALESCE(dms.avg_demand, 0) * COALESCE(sl.supplier_lead_time, v_default_lead_time)
                ) + (
                    v_z_score * COALESCE(dms.std_demand, 0) * SQRT(
                        COALESCE(sl.supplier_lead_time, v_default_lead_time)::NUMERIC
                    )
                )
            )::NUMERIC,
            2
        ),
        CASE
            WHEN COALESCE(dms.days_with_sales, 0) = 0 THEN v_default_rol
            ELSE 0
        END
    ) AS reorder_level,
    sl.supplier_id AS primary_supplier_id,
    CASE
        WHEN COALESCE(dms.days_with_sales, 0) = 0 THEN 'default'
        ELSE 'calculated'
    END AS source
FROM target_products tp
    LEFT JOIN demand_stats dms ON dms.pid = tp.pid
    LEFT JOIN supplier_lookup sl ON sl.pid = tp.pid;
END;
$$;
CREATE OR REPLACE FUNCTION public.refresh_reorder_levels(p_product_ids UUID [] DEFAULT NULL) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE v_count INTEGER := 0;
v_lookback INTEGER;
v_service_level NUMERIC;
v_rec RECORD;
BEGIN
SELECT default_lookback_days,
    default_service_level INTO v_lookback,
    v_service_level
FROM reorder_level_settings
LIMIT 1;
v_lookback := COALESCE(v_lookback, 90);
v_service_level := COALESCE(v_service_level, 0.95);
FOR v_rec IN
SELECT *
FROM calculate_reorder_levels(p_product_ids, v_lookback, v_service_level) LOOP
INSERT INTO product_inventory_policies (
        product_id,
        avg_daily_demand,
        demand_std_dev,
        lead_time_days,
        safety_stock,
        reorder_level,
        service_level,
        lookback_days,
        primary_supplier_id,
        source,
        last_calculated_at
    )
VALUES (
        v_rec.product_id,
        v_rec.avg_daily_demand,
        v_rec.demand_std_dev,
        v_rec.lead_time_days,
        v_rec.safety_stock,
        v_rec.reorder_level,
        v_service_level,
        v_lookback,
        v_rec.primary_supplier_id,
        v_rec.source,
        now()
    ) ON CONFLICT (product_id) DO
UPDATE
SET avg_daily_demand = EXCLUDED.avg_daily_demand,
    demand_std_dev = EXCLUDED.demand_std_dev,
    lead_time_days = EXCLUDED.lead_time_days,
    safety_stock = EXCLUDED.safety_stock,
    reorder_level = EXCLUDED.reorder_level,
    service_level = EXCLUDED.service_level,
    lookback_days = EXCLUDED.lookback_days,
    primary_supplier_id = EXCLUDED.primary_supplier_id,
    source = EXCLUDED.source,
    last_calculated_at = now(),
    updated_at = now()
WHERE product_inventory_policies.manual_override = false;
UPDATE products
SET reorder_level = v_rec.reorder_level
WHERE id = v_rec.product_id
    AND NOT EXISTS (
        SELECT 1
        FROM product_inventory_policies pip
        WHERE pip.product_id = v_rec.product_id
            AND pip.manual_override = true
    );
v_count := v_count + 1;
END LOOP;
RETURN v_count;
END;
$$;
/*=======================================================================
 PRODUCT MOVEMENT ANALYSIS
 Classifies every tracked product as FAST / SLOW / NON_MOVING based on
 days since the last completed sale.
 ========================================================================*/
CREATE OR REPLACE FUNCTION get_product_movement_analysis(
        p_fast_days INTEGER DEFAULT 30,
        p_slow_days INTEGER DEFAULT 90
    ) RETURNS TABLE(
        product_id UUID,
        product_name VARCHAR,
        category_name VARCHAR,
        unit VARCHAR,
        current_stock INTEGER,
        cost_price NUMERIC,
        reorder_level INTEGER,
        stock_value NUMERIC,
        last_sale_date TIMESTAMPTZ,
        days_since_last_sale INTEGER,
        movement_category VARCHAR
    ) LANGUAGE sql STABLE AS $$
SELECT p.id AS product_id,
    p.name AS product_name,
    c.name AS category_name,
    p.unit AS unit,
    COALESCE(p.current_stock, 0)::INTEGER AS current_stock,
    COALESCE(p.cost_price, 0) AS cost_price,
    COALESCE(p.reorder_level, 0)::INTEGER AS reorder_level,
    (
        COALESCE(p.current_stock, 0) * COALESCE(p.cost_price, 0)
    )::NUMERIC AS stock_value,
    ls.last_sale_date,
    COALESCE(
        EXTRACT(
            DAY
            FROM (NOW() - ls.last_sale_date)
        )::INTEGER,
        9999
    ) AS days_since_last_sale,
    CASE
        WHEN ls.last_sale_date IS NULL THEN 'NON_MOVING'
        WHEN EXTRACT(
            DAY
            FROM (NOW() - ls.last_sale_date)
        )::INTEGER <= p_fast_days THEN 'FAST'
        WHEN EXTRACT(
            DAY
            FROM (NOW() - ls.last_sale_date)
        )::INTEGER <= p_slow_days THEN 'SLOW'
        ELSE 'NON_MOVING'
    END AS movement_category
FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN LATERAL (
        SELECT MAX(b.created_at) AS last_sale_date
        FROM round_items ri
            JOIN rounds r ON r.id = ri.round_id
            JOIN bills b ON b.id = r.bill_id
        WHERE ri.product_id = p.id
            AND b.status = 'completed'
    ) ls ON TRUE
WHERE p.track_inventory = TRUE
    AND p.active = TRUE
ORDER BY days_since_last_sale DESC;
$$;
/*=======================================================================
 PRODUCT CONVERSION
 Atomically converts source product stock into target product stock,
 creating paired inventory movements and a conversion log entry.
 ========================================================================*/
CREATE OR REPLACE FUNCTION public.execute_product_conversion(
        p_source_product_id UUID,
        p_target_product_id UUID,
        p_source_qty NUMERIC,
        p_target_qty NUMERIC,
        p_notes TEXT DEFAULT NULL,
        p_user_id UUID DEFAULT NULL
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_source_stock NUMERIC;
v_source_cost NUMERIC;
v_target_cost NUMERIC;
v_out_id UUID;
v_in_id UUID;
v_conv_id UUID;
BEGIN
SELECT cost_price INTO v_source_cost
FROM public.products
WHERE id = p_source_product_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Source product not found';
END IF;
SELECT cost_price INTO v_target_cost
FROM public.products
WHERE id = p_target_product_id;
IF NOT FOUND THEN RAISE EXCEPTION 'Target product not found';
END IF;
-- quantity is already signed: positive=in, negative=out
SELECT COALESCE(SUM(quantity), 0) INTO v_source_stock
FROM public.inventory_movements
WHERE product_id = p_source_product_id;
IF v_source_stock < p_source_qty THEN RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %',
v_source_stock,
p_source_qty;
END IF;
IF v_source_cost IS NOT NULL
AND v_source_cost > 0 THEN v_target_cost := (p_source_qty * v_source_cost) / p_target_qty;
END IF;
INSERT INTO public.inventory_movements (
        product_id,
        movement_date,
        quantity,
        movement_type,
        reference_type,
        reference_id,
        notes,
        created_by
    )
VALUES (
        p_source_product_id,
        CURRENT_DATE,
        -p_source_qty,
        'conversion_out',
        'conversion',
        gen_random_uuid(),
        p_notes,
        p_user_id
    )
RETURNING id INTO v_out_id;
INSERT INTO public.inventory_movements (
        product_id,
        movement_date,
        quantity,
        movement_type,
        reference_type,
        reference_id,
        notes,
        created_by
    )
VALUES (
        p_target_product_id,
        CURRENT_DATE,
        p_target_qty,
        'conversion_in',
        'conversion',
        gen_random_uuid(),
        p_notes,
        p_user_id
    )
RETURNING id INTO v_in_id;
INSERT INTO public.product_conversions (
        source_product_id,
        target_product_id,
        source_qty,
        target_qty,
        notes,
        created_by,
        source_movement_id,
        target_movement_id
    )
VALUES (
        p_source_product_id,
        p_target_product_id,
        p_source_qty,
        p_target_qty,
        p_notes,
        p_user_id,
        v_out_id,
        v_in_id
    )
RETURNING id INTO v_conv_id;
RETURN jsonb_build_object(
    'conversion_id',
    v_conv_id,
    'source_movement_id',
    v_out_id,
    'target_movement_id',
    v_in_id,
    'source_qty',
    p_source_qty,
    'target_qty',
    p_target_qty
);
END;
$$;
/*=======================================================================
 BANK RECONCILIATION FUNCTIONS
 ============================================================================
 */

CREATE OR REPLACE FUNCTION public.import_bank_statement(
    p_bank_account_id uuid,
    p_statement_date date,
    p_statement_number text,
    p_opening_balance numeric,
    p_closing_balance numeric,
    p_lines jsonb,
    p_imported_by uuid,
    p_file_name text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
    v_statement_id uuid;
    v_line jsonb;
BEGIN
    INSERT INTO bank_statements (
        bank_account_id,
        statement_date,
        start_date,
        end_date,
        opening_balance,
        closing_balance,
        description,
        imported_by
    )
    VALUES (
        p_bank_account_id,
        p_statement_date,
        p_statement_date,
        p_statement_date,
        p_opening_balance,
        p_closing_balance,
        COALESCE(p_statement_number, 'Statement ' || p_statement_date::text),
        p_imported_by
    )
    RETURNING id INTO v_statement_id;

    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        INSERT INTO bank_statement_lines (
            statement_id,
            transaction_date,
            description,
            reference,
            deposit,
            withdrawal
        )
        VALUES (
            v_statement_id,
            (v_line->>'transaction_date')::date,
            v_line->>'description',
            v_line->>'reference',
            COALESCE((v_line->>'deposit')::numeric, 0),
            COALESCE((v_line->>'withdrawal')::numeric, 0)
        );
    END LOOP;

    RETURN v_statement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_match_bank_statement(
    p_statement_id uuid,
    p_match_threshold numeric DEFAULT 0.01
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
    v_line RECORD;
    v_match RECORD;
    v_matched_count integer := 0;
    v_unmatched_count integer := 0;
BEGIN
    FOR v_line IN
        SELECT id, transaction_date, deposit, withdrawal
        FROM bank_statement_lines
        WHERE statement_id = p_statement_id
          AND match_status = 'unmatched'
    LOOP
        SELECT * INTO v_match
        FROM v_unreconciled_bank_transactions u
        WHERE u.account_id = (SELECT bank_account_id FROM bank_statements WHERE id = p_statement_id)
          AND ABS(u.net_amount - (COALESCE(v_line.deposit, 0) - COALESCE(v_line.withdrawal, 0))) <= p_match_threshold
          AND ABS(u.entry_date - v_line.transaction_date) <= 2
        ORDER BY ABS(u.entry_date - v_line.transaction_date)
        LIMIT 1;

        IF FOUND THEN
            UPDATE bank_statement_lines
            SET match_status = 'matched',
                matched_transaction_id = v_match.journal_entry_id,
                matched_transaction_type = 'journal_entry',
                matched_at = now()
            WHERE id = v_line.id;
            v_matched_count := v_matched_count + 1;
        ELSE
            v_unmatched_count := v_unmatched_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('matched', v_matched_count, 'unmatched', v_unmatched_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.manual_match_statement_line(
    p_line_id uuid,
    p_transaction_id uuid,
    p_transaction_type varchar,
    p_matched_by uuid,
    p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
    UPDATE bank_statement_lines
    SET match_status = 'matched',
        matched_transaction_id = p_transaction_id,
        matched_transaction_type = p_transaction_type,
        matched_by = p_matched_by,
        matched_at = now(),
        match_notes = p_notes
    WHERE id = p_line_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_bank_reconciliation(
    p_bank_account_id uuid DEFAULT NULL,
    p_statement_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
    v_statement_id uuid;
    v_result jsonb;
BEGIN
    IF p_statement_id IS NOT NULL THEN
        v_statement_id := p_statement_id;
    ELSIF p_bank_account_id IS NOT NULL THEN
        SELECT id INTO v_statement_id
        FROM bank_statements
        WHERE bank_account_id = p_bank_account_id
        ORDER BY statement_date DESC
        LIMIT 1;
    END IF;

    IF v_statement_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_build_object(
        'statement', jsonb_build_object(
            'id', bs.id,
            'bank_account_id', bs.bank_account_id,
            'statement_date', bs.statement_date,
            'start_date', bs.start_date,
            'end_date', bs.end_date,
            'opening_balance', bs.opening_balance,
            'closing_balance', bs.closing_balance,
            'description', bs.description,
            'status', bs.status,
            'imported_by', bs.imported_by,
            'reconciled_by', bs.reconciled_by,
            'reconciled_at', bs.reconciled_at,
            'created_at', bs.created_at
        ),
        'lines', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', bsl.id,
                'transaction_date', bsl.transaction_date,
                'description', bsl.description,
                'reference', bsl.reference,
                'deposit', bsl.deposit,
                'withdrawal', bsl.withdrawal,
                'match_status', bsl.match_status,
                'matched_transaction_id', bsl.matched_transaction_id,
                'matched_transaction_type', bsl.matched_transaction_type,
                'matched_by', bsl.matched_by,
                'matched_at', bsl.matched_at,
                'match_notes', bsl.match_notes
            ) ORDER BY bsl.transaction_date)
            FROM bank_statement_lines bsl
            WHERE bsl.statement_id = v_statement_id
        ), '[]'::jsonb)
    ) INTO v_result
    FROM bank_statements bs
    WHERE bs.id = v_statement_id;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_get_suggested_matches(
    p_line_id uuid
) RETURNS TABLE (
    journal_entry_id uuid,
    entry_date date,
    reference text,
    description text,
    debit numeric,
    credit numeric,
    net_amount numeric,
    source_type text
) LANGUAGE plpgsql AS $$
DECLARE
    v_line RECORD;
    v_bank_account_id uuid;
BEGIN
    SELECT * INTO v_line
    FROM bank_statement_lines
    WHERE id = p_line_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT bank_account_id INTO v_bank_account_id
    FROM bank_statements
    WHERE id = v_line.statement_id;

    RETURN QUERY
    SELECT
        u.journal_entry_id,
        u.entry_date,
        u.reference,
        u.entry_description,
        u.debit,
        u.credit,
        u.net_amount,
        u.source_type
    FROM v_unreconciled_bank_transactions u
    WHERE u.account_id = v_bank_account_id
      AND ABS(u.net_amount - (COALESCE(v_line.deposit, 0) - COALESCE(v_line.withdrawal, 0))) <= 0.01
      AND ABS(u.entry_date - v_line.transaction_date) <= 7
    ORDER BY ABS(u.entry_date - v_line.transaction_date), ABS(u.net_amount - (COALESCE(v_line.deposit, 0) - COALESCE(v_line.withdrawal, 0)))
    LIMIT 10;
END;
$$;
