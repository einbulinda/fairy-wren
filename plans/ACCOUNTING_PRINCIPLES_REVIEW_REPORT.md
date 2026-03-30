# Accounting Principles & Rules Implementation Review

**Report Date:** March 26, 2026

---

## Executive Summary

This report provides a comprehensive review of the accounting principles and rules implementation in the Fairy Wren ERP/POS ecosystem. The system implements a double-entry bookkeeping framework with automated journal postings for key business transactions.

**Overall Assessment:** The system has a **solid foundation** with proper double-entry accounting and **correct revenue recognition timing**. The primary issue identified is an **incomplete void process** that fails to reverse revenue entries, causing A/R balance inflation.

---

## 1. IMPLEMENTED ACCOUNTING PRINCIPLES

### 1.1 Double-Entry Bookkeeping (✅ IMPLEMENTED)

**Implementation Status:** Well Implemented

The system correctly implements double-entry bookkeeping principles:

- **Journal Entries Table:** `journal_entries` with headers (date, reference, description, source tracking)
- **Journal Lines Table:** `journal_lines` with debit/credit amounts
- **Balance Enforcement:** Database trigger `enforce_balanced_journal()` prevents unbalanced entries
- **Validation in DTO:** `CreateJournalDTO` validates that total debits equal total credits

```sql
-- Trigger ensures journal balance
CREATE OR REPLACE FUNCTION enforce_balanced_journal()
RETURNS trigger AS $$
BEGIN
    IF (SELECT COALESCE(SUM(debit), 0) != COALESCE(SUM(credit), 0)
        FROM journal_lines
        WHERE journal_entry_id = NEW.journal_entry_id) THEN
        RAISE EXCEPTION 'Journal entry % is not balanced', NEW.journal_entry_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 1.2 Chart of Accounts Structure (✅ IMPLEMENTED)

**Implementation Status:** Well Implemented

- **Hierarchical Structure:** Parent-child relationships via `parent_id`
- **Account Classes:** asset, current_asset, non_current_asset, bank, liability, current_liability, non_current_liability, equity, income, expense, cost_of_sales, finance_cost, admin_cost, operating_cost
- **Control Accounts:** Support for control accounts with `is_control_account` flag
- **Normal Balance:** Each account has a defined normal balance (debit/credit)
- **Code Uniqueness:** Enforced at database level

**Key Control Accounts:**
- `2100` - Trade Payables (Accounts Payable control)
- `1201` - A/R Open Bills (Accounts Receivable)
- `4000` - Sales Revenue
- `5000` - Cost of Sales (parent)
- `5003` - Inventory Purchases

### 1.3 Financial Statements (✅ IMPLEMENTED)

**Implementation Status:** Implemented with Limitations

| Statement | RPC Function | Status |
|-----------|-------------|--------|
| Balance Sheet | `rpc_balance_sheet()` | ✅ Implemented |
| Income Statement | `rpc_income_statement()` | ✅ Implemented with computed inventory rows |
| Trial Balance | `rpc_trial_balance()` | ✅ Implemented |
| Cash Flow Statement | `rpc_cash_flow_data()` | ✅ Implemented |
| Statement of Equity Changes | `rpc_equity_changes()` | ✅ Implemented |

**Income Statement Features:**
- Regular income/expense accounts
- Computed Opening Inventory (code 5001)
- Computed Closing Inventory (code 5099)
- Cost of Sales calculation with inventory movement

### 1.4 Revenue Recognition (✅ CORRECTLY IMPLEMENTED)

**Implementation Status:** Correct per IFRS 15

**Recognition Point:** At round submission (when items are served to customer)

**Accounting Entries at Service:**
```
DR 1201 A/R Open Bills        XXX
    CR 4000 Sales Revenue         XXX
(Revenue recognized - control transferred)

DR 5003 Inventory Purchases   XXX
    CR 40xx Inventory Asset       XXX
(COGS recognized - inventory consumed)
```

**Why This is Correct:**
- Control of the item transfers to customer at point of service
- The business has satisfied its performance obligation
- Revenue is earned regardless of when payment is received
- Matching principle: COGS is recognized in same period as related revenue

### 1.5 Accounts Payable (✅ IMPLEMENTED)

**Implementation Status:** Well Implemented

- **Supplier-Specific AP Accounts:** Each supplier gets a dedicated child account under Trade Payables (2100)
- **Automatic Posting:** Inventory purchases auto-post to DR Inventory / CR Supplier AP
- **Hierarchical Structure:** All supplier accounts roll up to 2100 control account
- **Supplier Statements:** `rpc_supplier_statement()` provides running balance

### 1.6 Inventory & COGS (✅ IMPLEMENTED)

**Implementation Status:** Implemented

**What Works:**
- Weighted average cost calculation via `inventory_avg_cost` view
- Inventory movements tracked in `inventory_movements` table
- Per-round COGS posting to account 5003 (Inventory Purchases)
- COGS journal: DR 5003 / CR Inventory Asset

---

## 2. CRITICAL WEAKNESSES

### 2.1 Incomplete Void Process (❌ CRITICAL)

**Problem:** When a bill is voided after round submission, the system reverses inventory and COGS but **fails to reverse the revenue entry**.

**Current Behavior:**
```
Round Served:
  DR 1201 A/R          XXX     CR 4000 Revenue      XXX
  DR 5003 COGS         XXX     CR Inventory         XXX

Bill Voided (CURRENT):
  DR Inventory         XXX     CR 5003 COGS         XXX  ✅ Reversed
  [MISSING] DR 4000    XXX     CR 1201 A/R          XXX  ❌ NOT Reversed!
```

**Impact:** 
- A/R Open Bills (1201) accumulates unreversed debit balances
- Revenue (4000) remains overstated for voided transactions
- Balance sheet shows inflated assets
- Income statement shows inflated revenue

**Root Cause:**
```javascript
// bills.service.js - voidBill only reverses inventory and COGS
exports.voidBill = async (id, context) => {
  const { error: reversalError } = await repo.reverseBillSale(id);
  // ... reverses inventory/COGS but NOT revenue
};
```

**Required Fix:**
```sql
-- Add to reverse_bill_sale() function:
-- Reverse the revenue entry
INSERT INTO journal_entries (
    entry_date, source_type, source_id, description, reversed_entry_id
)
VALUES (
    CURRENT_DATE, 'round_sale_reversal', v_round.id, 
    'Revenue reversal - bill voided', v_original_entry.id
)
RETURNING id INTO v_reversal_id;

INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
VALUES 
    (v_reversal_id, v_sales_account, v_round_total, 0),  -- DR Revenue
    (v_reversal_id, v_ar_account, 0, v_round_total);     -- CR A/R
```

### 2.2 Zero Cost COGS Handling (⚠️ HIGH PRIORITY)

**Problem:** COGS is posted using weighted average cost, but if cost is zero (NULL), it defaults to 0, leading to zero COGS.

**Code Evidence:**
```sql
-- From post_round_sale:
SELECT COALESCE(avg_unit_cost, 0) INTO v_avg_cost
FROM inventory_avg_cost
WHERE product_id = v_item.product_id;

IF v_avg_cost IS NULL THEN v_avg_cost := 0; END IF;
```

**Impact:**
- Inflated gross profit when COGS is 0
- Inaccurate profitability analysis
- Potential for abuse (selling items without proper cost tracking)

**Recommendation:**
```sql
-- Option 1: Prevent zero-cost sales
IF v_avg_cost = 0 THEN
    RAISE EXCEPTION 'Cannot sell product % with zero cost. Check inventory receipt records.', 
        v_item.product_id;
END IF;

-- Option 2: Require manual cost override with approval
IF v_avg_cost = 0 THEN
    -- Use manually specified cost with audit logging
    v_avg_cost := p_manual_cost_override;
END IF;
```

### 2.3 Period-End Closing Process (❌ NOT IMPLEMENTED)

**Problem:** No formal period-end closing process exists.

**Missing Features:**
- No period locking mechanism
- No cutoff procedures for transactions
- No automatic calculation and posting of closing inventory
- No retained earnings roll-forward
- No suspense account clearing

**Impact:**
- Transactions can be posted to closed periods
- Financial statements may change retroactively
- No audit trail of period closures
- Year-end closing process is manual and error-prone

**Recommendation:**
```sql
-- Implement period locking
CREATE TABLE accounting_periods (
    period_id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, closing, closed
    closed_by UUID REFERENCES profiles(id),
    closed_at TIMESTAMPTZ,
    UNIQUE(year, month)
);

-- Add validation trigger
CREATE OR REPLACE FUNCTION check_period_lock()
RETURNS trigger AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM accounting_periods
        WHERE start_date <= NEW.entry_date 
        AND end_date >= NEW.entry_date
        AND status = 'closed'
    ) THEN
        RAISE EXCEPTION 'Cannot post to closed period';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2.4 Bank Reconciliation (❌ NOT IMPLEMENTED)

**Problem:** No formal bank reconciliation process.

**Missing:**
- Bank statement import
- Automatic matching of transactions
- Unreconciled item tracking
- Bank reconciliation report

### 2.5 Multi-Currency Support (❌ NOT IMPLEMENTED)

**Problem:** All transactions assumed to be in single currency.

**Missing:**
- Currency conversion rates
- Foreign currency transaction recording
- Exchange gain/loss calculation

---

## 3. PENDING IMPLEMENTATIONS FOR ACCURATE ACCOUNTING

### 3.1 Fix Void Process (HIGH PRIORITY)

**Required Implementation:**

1. **Update `reverse_bill_sale()` to reverse revenue:**
```sql
-- Find and reverse all revenue entries for the bill's rounds
FOR v_entry IN
    SELECT je.id, je.source_id, SUM(jl.debit) as amount
    FROM journal_entries je
    JOIN journal_lines jl ON jl.journal_entry_id = je.id
    WHERE je.source_type = 'round_sale'
    AND je.source_id IN (SELECT id FROM rounds WHERE bill_id = p_bill_id)
    AND je.reversed_entry_id IS NULL
    GROUP BY je.id, je.source_id
LOOP
    -- Create reversal entry
    INSERT INTO journal_entries (
        entry_date, source_type, source_id, 
        description, reversed_entry_id
    )
    VALUES (
        CURRENT_DATE, 'round_sale_reversal', v_entry.source_id,
        'Revenue reversal - bill voided', v_entry.id
    )
    RETURNING id INTO v_reversal_id;
    
    -- Get the sales account and A/R account from original entry
    SELECT account_id INTO v_sales_account
    FROM journal_lines 
    WHERE journal_entry_id = v_entry.id AND credit > 0;
    
    SELECT account_id INTO v_ar_account
    FROM journal_lines 
    WHERE journal_entry_id = v_entry.id AND debit > 0;
    
    -- Reverse: DR Revenue, CR A/R
    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
    VALUES 
        (v_reversal_id, v_sales_account, v_entry.amount, 0),
        (v_reversal_id, v_ar_account, 0, v_entry.amount);
END LOOP;
```

2. **Backfill Historical Voided Bills:**
```sql
-- Find all voided bills with unreversed revenue entries
-- and create reversal journals
```

### 3.2 Zero Cost Protection (HIGH PRIORITY)

**Required Implementation:**

```sql
-- Add to post_round_sale before COGS posting
IF v_avg_cost = 0 THEN
    -- Check if this is a legitimate zero-cost item (e.g., promotional)
    IF NOT is_promotional_item(v_item.product_id) THEN
        RAISE EXCEPTION 'Cannot post COGS for product % with zero cost. Verify inventory receipts.', 
            v_item.product_id;
    END IF;
END IF;
```

### 3.3 Period-End Closing (HIGH PRIORITY)

**Required Implementation:**

1. **Period Locking:**
   - Create `accounting_periods` table
   - Add status tracking (open, closing, closed)
   - Implement user permissions for closing

2. **Automatic Closing Entries:**
   - Close revenue accounts to retained earnings
   - Close expense accounts to retained earnings
   - Reset temporary accounts

3. **Cutoff Controls:**
   - Prevent posting to closed periods
   - Grace period for prior period adjustments

### 3.4 A/R Allowance for Doubtful Accounts (MEDIUM PRIORITY)

**Required Implementation:**

```sql
-- Create allowance account
INSERT INTO chart_of_accounts (code, name, account_class, normal_balance, parent_id)
VALUES ('1210', 'Allowance for Doubtful Accounts', 'current_asset', 'credit', 
        (SELECT id FROM chart_of_accounts WHERE code = '1200'));

-- A/R aging function
CREATE OR REPLACE FUNCTION rpc_ar_aging(p_as_of_date date)
RETURNS TABLE (bucket text, amount numeric) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN age <= 30 THEN '0-30 days'
            WHEN age <= 60 THEN '31-60 days'
            WHEN age <= 90 THEN '61-90 days'
            ELSE '90+ days'
        END as bucket,
        SUM(balance) as amount
    FROM (
        SELECT 
            p_as_of_date - je.entry_date as age,
            SUM(jl.debit - jl.credit) as balance
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id
        WHERE jl.account_id = (SELECT id FROM chart_of_accounts WHERE code = '1201')
        AND je.entry_date <= p_as_of_date
        AND je.reversed_entry_id IS NULL
        GROUP BY je.entry_date
        HAVING SUM(jl.debit - jl.credit) > 0
    ) sub
    GROUP BY 1;
END;
$$ LANGUAGE plpgsql;
```

### 3.5 Segregation of Duties (MEDIUM PRIORITY)

**Required Implementation:**

1. **Journal Entry Approval:**
   - Separate roles for creating vs approving manual journal entries
   - Maker-checker workflow
   - Email notifications for pending approvals

2. **Payment Approval:**
   - Already partially implemented via `approve_payments` permission
   - Extend to supplier payments

### 3.6 Reporting Enhancements (MEDIUM PRIORITY)

**Required Implementation:**

1. **Comparative Financial Statements:**
   - Current period vs prior period
   - Variance analysis

2. **Aging Reports:**
   - A/R aging (0-30, 31-60, 61-90, 90+ days)
   - A/P aging

3. **Audit Trail Enhancements:**
   - Complete transaction history
   - Journal entry modification tracking

---

## 4. STRENGTHS OF CURRENT IMPLEMENTATION

### 4.1 Correct Revenue Recognition

The system correctly recognizes revenue at point of service (round submission):
- Revenue earned when control transfers to customer
- COGS matched to same period (matching principle)
- A/R established for amounts owed by customers

### 4.2 Automated Journal Posting

The system excels at automated journal creation:

- **Inventory Purchases:** DR Inventory / CR AP (automatic)
- **Sales:** DR A/R / CR Revenue (at round submission)
- **COGS:** DR COGS / CR Inventory (automatic)
- **Payments:** DR Cash / CR A/R (at confirmation)

### 4.3 Audit Trail

Comprehensive audit logging:
- `audit_logs` table tracks all changes
- `stock_take_audit_log` for inventory adjustments
- User attribution on all transactions

### 4.4 Reversal Mechanism

Proper journal reversal structure exists:
- `reverseBillSale()` reverses inventory and COGS
- `voidJournal()` creates reversing entries (swaps DR/CR)
- Links reversal to original entry via `reversed_entry_id`

### 4.5 Financial Statement Accuracy

The RPC functions properly calculate:
- Balance sheet with correct account classes
- Income statement with computed inventory rows
- Trial balance showing all accounts
- Net income calculation

---

## 5. RECOMMENDED ACTION PLAN

### Phase 1: Critical Fixes (Immediate - 1 week)

1. **Fix Void Process - Revenue Reversal**
   - Update `reverse_bill_sale()` to reverse revenue entries
   - Add SQL migration to backfill historical voided bills
   - Test with sample voided bills

2. **Zero Cost Protection**
   - Add check to prevent zero-cost COGS posting
   - Alert on inventory with missing cost data
   - Review historical zero-cost sales

### Phase 2: Period-End Controls (2-4 weeks)

1. **Implement Period Locking**
   - Create `accounting_periods` table
   - Add period validation to posting functions
   - Build period management UI

2. **Closing Entry Automation**
   - Create procedure for closing entries
   - Implement retained earnings update
   - Add closing checklist

### Phase 3: Enhanced Controls (1-2 months)

1. **Segregation of Duties**
   - Add approval workflows for manual journals
   - Implement maker-checker for adjustments

2. **Aging Reports**
   - Create A/R aging function
   - Create A/P aging function
   - Build allowance calculation

3. **Bank Reconciliation**
   - Design reconciliation process
   - Build reconciliation UI

### Phase 4: Advanced Features (2-3 months)

1. **Multi-Currency Support**
2. **Tax Accounting Module**
3. **Advanced Analytics**

---

## 6. CONCLUSION

The Fairy Wren accounting system demonstrates a **solid understanding of accounting principles** with:

✅ **Correct revenue recognition** at point of service  
✅ **Proper double-entry bookkeeping**  
✅ **Automated journal posting** for key transactions  
✅ **Complete financial statement generation**

**The primary issue** is the incomplete void process that fails to reverse revenue entries, causing A/R balance inflation. This is a **fixable implementation gap**, not a fundamental design flaw.

**Immediate priority:** Fix the void process to reverse ALL journal entries (inventory, COGS, AND revenue) when a bill is voided.

Once this is addressed, the system will provide accurate financial reporting that properly reflects the business operations.

---

## Appendix: Key Database Objects

### Core Tables
- `chart_of_accounts` - Chart of accounts
- `journal_entries` - Journal entry headers
- `journal_lines` - Journal entry lines (debits/credits)
- `account_classes` - Account classification lookup

### Key Functions
- `rpc_balance_sheet()` - Generate balance sheet
- `rpc_income_statement()` - Generate income statement
- `rpc_trial_balance()` - Generate trial balance
- `post_round_sale()` - Post sales and COGS journals
- `post_payment_journal()` - Post payment journals
- `reverse_bill_sale()` - Reverse sales journals on void ⚠️ **NEEDS FIX**

### Key Views
- `inventory_avg_cost` - Weighted average cost by product
- `bill_totals` - Bill totals with payment status
- `v_balance_sheet_account_visibility` - Debug account visibility

---

## Document Information

- **Report Generated:** March 26, 2026
- **System Version:** Based on codebase review as of March 26, 2026
- **Review Scope:** api/src/database (schema, functions, triggers, migrations), service layer
- **Methodology:** Code review, cross-reference analysis, accounting standards compliance check
