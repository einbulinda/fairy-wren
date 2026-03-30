# Accounting System Fixes - Implementation & Deployment Plan

**Document Date:** March 26, 2026  
**Target Implementation:** April 2026  
**Estimated Duration:** 4-6 weeks

---

## 1. EXECUTIVE SUMMARY

### Scope
This plan details the implementation of critical accounting fixes identified in the Accounting Principles Review:
1. **Phase 1:** Fix void process to reverse revenue entries (CRITICAL)
2. **Phase 2:** Implement zero-cost protection (HIGH)
3. **Phase 3:** Deploy period-end closing controls (HIGH)

### Impact Summary
| Phase | Business Impact | Downtime | Data Risk |
|-------|----------------|----------|-----------|
| Phase 1 | Corrects A/R balances | None (non-breaking) | Low |
| Phase 2 | Prevents future errors | None | Low |
| Phase 3 | Enables period control | Minimal | Medium |

---

## 2. PHASE 1: FIX VOID PROCESS (CRITICAL)

### 2.1 Problem Statement
When bills are voided, revenue entries are not reversed, causing:
- Inflated A/R Open Bills balance
- Overstated revenue in income statement
- Phantom receivables

### 2.2 Solution Design

#### Approach: Dual-Track Fix
1. **Immediate:** Fix forward - ensure new voids reverse revenue
2. **Follow-up:** Backfill - correct historical voided bills

### 2.3 Implementation Steps

#### Step 1: Update `reverse_bill_sale()` Function (Day 1-2)

**File:** `api/src/database/migrations/20260326_001_fix_void_revenue_reversal.sql`

```sql
-- ============================================================================
-- Migration: Fix Revenue Reversal on Bill Void
-- Description: Updates reverse_bill_sale to also reverse revenue entries
-- ============================================================================

-- 1. Update the reverse_bill_sale function
CREATE OR REPLACE FUNCTION public.reverse_bill_sale(p_bill_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_round RECORD;
    v_item RECORD;
    v_entry RECORD;
    v_reversal_id UUID;
    v_avg_cost NUMERIC;
    v_sales_account UUID;
    v_ar_account UUID;
    v_round_total NUMERIC;
BEGIN
    /* =====================================================
       PART 1: Reverse inventory movements (existing logic)
       ===================================================== */
    FOR v_round IN
        SELECT id FROM rounds WHERE bill_id = p_bill_id
    LOOP
        FOR v_item IN
            SELECT ri.id, ri.product_id, ri.quantity
            FROM round_items ri
            WHERE ri.round_id = v_round.id
              AND ri.inventory_posted = true
        LOOP
            -- Get original cost
            SELECT COALESCE(unit_cost, 0) INTO v_avg_cost
            FROM inventory_movements
            WHERE reference_type = 'round'
              AND reference_id = v_round.id
              AND product_id = v_item.product_id
              AND quantity < 0
            LIMIT 1;

            -- Insert reversal movement
            INSERT INTO inventory_movements (
                product_id, movement_date, quantity, unit_cost,
                movement_type, reference_type, reference_id, notes
            ) VALUES (
                v_item.product_id, CURRENT_DATE, v_item.quantity, v_avg_cost,
                'adjustment_in', 'void', v_round.id, 'Reversal - bill voided'
            );

            -- Mark as unposted
            UPDATE round_items SET inventory_posted = false WHERE id = v_item.id;
        END LOOP;
    END LOOP;

    /* =====================================================
       PART 2: Reverse COGS journal entries (existing logic)
       ===================================================== */
    FOR v_round IN
        SELECT id FROM rounds WHERE bill_id = p_bill_id
    LOOP
        FOR v_entry IN
            SELECT je.id, je.source_type, je.source_id, je.description
            FROM journal_entries je
            WHERE je.source_id = v_round.id
              AND je.source_type = 'round_cogs'
              AND je.reversed_entry_id IS NULL
        LOOP
            -- Create reversal
            INSERT INTO journal_entries (
                entry_date, source_type, source_id, 
                description, reversed_entry_id
            ) VALUES (
                CURRENT_DATE, v_entry.source_type || '_reversal', 
                v_entry.source_id, v_entry.description || ' (VOID REVERSAL)',
                v_entry.id
            ) RETURNING id INTO v_reversal_id;

            -- Reverse lines
            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            SELECT v_reversal_id, account_id, credit, debit
            FROM journal_lines WHERE journal_entry_id = v_entry.id;

            -- Mark original as reversed
            UPDATE journal_entries SET reversed_entry_id = v_reversal_id WHERE id = v_entry.id;
        END LOOP;
    END LOOP;

    /* =====================================================
       PART 3: Reverse REVENUE journal entries (NEW)
       ===================================================== */
    -- Resolve A/R and Sales accounts once
    SELECT id INTO v_ar_account FROM chart_of_accounts WHERE code = '1201';
    SELECT id INTO v_sales_account FROM chart_of_accounts WHERE code = '4000';

    FOR v_round IN
        SELECT id FROM rounds WHERE bill_id = p_bill_id
    LOOP
        FOR v_entry IN
            SELECT je.id, je.source_id, SUM(jl.debit) as total_amount
            FROM journal_entries je
            JOIN journal_lines jl ON jl.journal_entry_id = je.id
            WHERE je.source_id = v_round.id
              AND je.source_type = 'round_sale'
              AND je.reversed_entry_id IS NULL
            GROUP BY je.id, je.source_id
        LOOP
            -- Create reversal entry
            INSERT INTO journal_entries (
                entry_date, source_type, source_id,
                description, reversed_entry_id
            ) VALUES (
                CURRENT_DATE, 'round_sale_reversal', v_entry.source_id,
                'Revenue reversal - bill voided', v_entry.id
            ) RETURNING id INTO v_reversal_id;

            -- Reverse: DR Revenue, CR A/R (opposite of original)
            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
            VALUES 
                (v_reversal_id, v_sales_account, v_entry.total_amount, 0),
                (v_reversal_id, v_ar_account, 0, v_entry.total_amount);

            -- Mark original as reversed
            UPDATE journal_entries SET reversed_entry_id = v_reversal_id WHERE id = v_entry.id;
        END LOOP;
    END LOOP;
END;
$$;

-- 2. Verify the function was created
COMMENT ON FUNCTION public.reverse_bill_sale(uuid) IS 
    'Reverses all journal entries (COGS and Revenue) when a bill is voided';
```

#### Step 2: Backfill Historical Voided Bills (Day 3-5)

**File:** `api/src/database/migrations/20260326_002_backfill_voided_bill_revenue.sql`

```sql
-- ============================================================================
-- Migration: Backfill Revenue Reversals for Historical Voided Bills
-- Description: Creates reversing entries for bills voided before the fix
-- SAFE TO RUN MULTIPLE TIMES (idempotent)
-- ============================================================================

DO $$
DECLARE
    v_bill RECORD;
    v_round RECORD;
    v_entry RECORD;
    v_reversal_id UUID;
    v_sales_account UUID;
    v_ar_account UUID;
    v_count INT := 0;
    v_total_amount NUMERIC;
BEGIN
    -- Resolve accounts
    SELECT id INTO v_ar_account FROM chart_of_accounts WHERE code = '1201';
    SELECT id INTO v_sales_account FROM chart_of_accounts WHERE code = '4000';

    IF v_ar_account IS NULL OR v_sales_account IS NULL THEN
        RAISE EXCEPTION 'Required accounts (1201, 4000) not found';
    END IF;

    -- Find all voided bills with unreversed revenue entries
    FOR v_bill IN
        SELECT DISTINCT b.id as bill_id, b.created_at
        FROM bills b
        WHERE b.status = 'void'
          AND EXISTS (
              -- Has revenue entries
              SELECT 1 FROM rounds r
              JOIN journal_entries je ON je.source_id = r.id 
                  AND je.source_type = 'round_sale'
                  AND je.reversed_entry_id IS NULL
              WHERE r.bill_id = b.id
          )
          AND NOT EXISTS (
              -- Does NOT have revenue reversals
              SELECT 1 FROM rounds r
              JOIN journal_entries je ON je.source_id = r.id 
                  AND je.source_type = 'round_sale_reversal'
              WHERE r.bill_id = b.id
          )
        ORDER BY b.created_at
    LOOP
        -- Process each round in the bill
        FOR v_round IN
            SELECT id FROM rounds WHERE bill_id = v_bill.bill_id
        LOOP
            FOR v_entry IN
                SELECT je.id, je.source_id, SUM(jl.debit) as total_amount
                FROM journal_entries je
                JOIN journal_lines jl ON jl.journal_entry_id = je.id
                WHERE je.source_id = v_round.id
                  AND je.source_type = 'round_sale'
                  AND je.reversed_entry_id IS NULL
                GROUP BY je.id, je.source_id
            LOOP
                -- Create reversal
                INSERT INTO journal_entries (
                    entry_date, source_type, source_id,
                    description, reversed_entry_id
                ) VALUES (
                    CURRENT_DATE, 'round_sale_reversal', v_entry.source_id,
                    'Revenue reversal - backfill for voided bill ' || v_bill.bill_id,
                    v_entry.id
                ) RETURNING id INTO v_reversal_id;

                -- Reverse the entry
                INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
                VALUES 
                    (v_reversal_id, v_sales_account, v_entry.total_amount, 0),
                    (v_reversal_id, v_ar_account, 0, v_entry.total_amount);

                -- Link reversal
                UPDATE journal_entries 
                SET reversed_entry_id = v_reversal_id 
                WHERE id = v_entry.id;

                v_count := v_count + 1;
            END LOOP;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Backfill complete: % revenue reversals created', v_count;
END;
$$ LANGUAGE plpgsql;

-- Create index for performance if not exists
CREATE INDEX IF NOT EXISTS idx_journal_entries_source 
ON journal_entries(source_type, source_id) 
WHERE reversed_entry_id IS NULL;
```

#### Step 3: Verification Query (Day 5)

```sql
-- Verify the fix worked
-- Should return 0 unreversed revenue entries for voided bills
SELECT COUNT(*) as unreversed_count
FROM bills b
JOIN rounds r ON r.bill_id = b.id
JOIN journal_entries je ON je.source_id = r.id 
    AND je.source_type = 'round_sale'
    AND je.reversed_entry_id IS NULL
WHERE b.status = 'void';

-- Check A/R balance before/after
SELECT 
    (SELECT COALESCE(SUM(debit - credit), 0) 
     FROM journal_lines 
     WHERE account_id = (SELECT id FROM chart_of_accounts WHERE code = '1201')
    ) as ar_balance,
    (SELECT COUNT(*) FROM bills WHERE status = 'void') as voided_bill_count;
```

### 2.4 Deployment Plan

| Day | Activity | Owner | Rollback Plan |
|-----|----------|-------|---------------|
| 1 | Create migration file | Dev | Delete file |
| 2 | Test in staging | QA | Restore DB snapshot |
| 3 | Deploy to production (off-peak) | DevOps | Restore from backup |
| 4 | Run backfill migration | DBA | Reverse with compensation entries |
| 5 | Verify and monitor | Finance + Dev | Emergency patch if issues |

### 2.5 Impact Assessment

#### During Deployment
- **Service Availability:** No downtime (non-breaking change)
- **User Impact:** None
- **Data Consistency:** Temporarily inconsistent until backfill completes

#### After Deployment
- **A/R Balance:** Will decrease by total of voided bill amounts
- **Revenue:** Historical periods will show lower revenue (correctly)
- **Performance:** New index improves query speed

---

## 3. PHASE 2: ZERO COST PROTECTION (HIGH)

### 3.1 Problem Statement
Items can be sold with zero cost, inflating gross profit.

### 3.2 Solution Design

#### Approach: Warning then Prevention
1. **Warning Mode:** Log warnings for zero-cost sales (Week 1)
2. **Enforcement Mode:** Block zero-cost sales (Week 2)

### 3.3 Implementation Steps

#### Step 1: Update `post_round_sale()` (Week 1)

**File:** `api/src/database/migrations/20260402_001_zero_cost_warning.sql`

```sql
-- Add warning mode first (non-breaking)
CREATE OR REPLACE FUNCTION public.post_round_sale(p_round_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    -- ... existing declarations ...
    v_zero_cost_count INT := 0;
BEGIN
    -- ... existing logic ...

    FOR v_item IN
        SELECT ri.id, ri.product_id, ri.quantity, ri.price
        FROM round_items ri
        WHERE ri.round_id = p_round_id
          AND ri.inventory_posted = false
    LOOP
        -- Get weighted average cost
        SELECT COALESCE(avg_unit_cost, 0) INTO v_avg_cost
        FROM inventory_avg_cost
        WHERE product_id = v_item.product_id;

        -- WARNING MODE: Log zero cost but still process
        IF v_avg_cost = 0 THEN
            v_zero_cost_count := v_zero_cost_count + 1;
            
            -- Log warning for analysis
            INSERT INTO system_warnings (
                warning_type, severity, message, 
                reference_type, reference_id, created_at
            ) VALUES (
                'ZERO_COST_SALE', 'WARNING',
                format('Product %s sold with zero cost. Round: %s', 
                       v_item.product_id, p_round_id),
                'round', p_round_id, NOW()
            );
            
            -- Still proceed with sale but mark for review
            v_avg_cost := 0;
        END IF;

        -- ... rest of logic ...
    END LOOP;

    -- If any zero-cost items, notify
    IF v_zero_cost_count > 0 THEN
        RAISE WARNING 'Round % has % items with zero cost', 
            p_round_id, v_zero_cost_count;
    END IF;
END;
$$;

-- Create warnings table if not exists
CREATE TABLE IF NOT EXISTS system_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warning_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- INFO, WARNING, ERROR
    message TEXT NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_warnings_unresolved 
ON system_warnings(warning_type, created_at) 
WHERE resolved = false;
```

#### Step 2: Enforcement Mode (Week 2)

**File:** `api/src/database/migrations/20260409_001_zero_cost_enforcement.sql`

```sql
-- After analyzing warnings, enable enforcement
CREATE OR REPLACE FUNCTION public.post_round_sale(p_round_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    -- ... existing declarations ...
    v_product_name TEXT;
BEGIN
    -- ... existing logic ...

    FOR v_item IN
        SELECT ri.id, ri.product_id, ri.quantity, ri.price
        FROM round_items ri
        WHERE ri.round_id = p_round_id
          AND ri.inventory_posted = false
    LOOP
        -- Get weighted average cost
        SELECT COALESCE(avg_unit_cost, 0) INTO v_avg_cost
        FROM inventory_avg_cost
        WHERE product_id = v_item.product_id;

        -- ENFORCEMENT MODE: Block zero cost sales
        IF v_avg_cost = 0 THEN
            SELECT name INTO v_product_name 
            FROM products WHERE id = v_item.product_id;
            
            RAISE EXCEPTION 'Cannot sell product "%" with zero cost. '
                'Please verify inventory receipts are posted for this product. '
                'Product ID: %, Round: %',
                v_product_name, v_item.product_id, p_round_id
                USING HINT = 'Check inventory receipts and ensure purchase journals are posted';
        END IF;

        -- ... rest of logic ...
    END LOOP;
END;
$$;
```

### 3.4 Deployment Plan

| Week | Activity | Action on Issue |
|------|----------|-----------------|
| 1 | Deploy warning mode | Monitor logs, identify affected products |
| 2 | Fix data issues | Update missing costs, post missing receipts |
| 3 | Deploy enforcement | If issues, temporarily revert to warning mode |

---

## 4. PHASE 3: PERIOD-END CLOSING (HIGH)

### 4.1 Problem Statement
No mechanism to lock periods or prevent retroactive postings.

### 4.2 Solution Design

#### Components:
1. **Period Management Table**
2. **Validation Triggers**
3. **Closing Entry Automation**
4. **Admin UI/API**

### 4.3 Implementation Steps

#### Step 1: Create Period Management Infrastructure

**File:** `api/src/database/migrations/20260416_001_accounting_periods.sql`

```sql
-- ============================================================================
-- Migration: Accounting Period Management
-- ============================================================================

-- 1. Create accounting periods table
CREATE TABLE public.accounting_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'open' 
        CHECK (status IN ('open', 'closing', 'closed', 'reopened')),
    closed_by UUID REFERENCES public.profiles(id),
    closed_at TIMESTAMPTZ,
    reopened_by UUID REFERENCES public.profiles(id),
    reopened_at TIMESTAMPTZ,
    reopen_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, month)
);

-- 2. Create index for date lookups
CREATE INDEX idx_accounting_periods_dates 
ON accounting_periods(start_date, end_date);

CREATE INDEX idx_accounting_periods_status 
ON accounting_periods(status) 
WHERE status IN ('open', 'closing');

-- 3. Create period validation trigger
CREATE OR REPLACE FUNCTION public.check_period_lock()
RETURNS trigger AS $$
DECLARE
    v_period_status VARCHAR(20);
    v_period_id UUID;
BEGIN
    -- Check if posting to a closed period
    SELECT id, status INTO v_period_id, v_period_status
    FROM accounting_periods
    WHERE NEW.entry_date >= start_date 
      AND NEW.entry_date <= end_date;

    IF v_period_status = 'closed' THEN
        RAISE EXCEPTION 'Cannot post to closed period. Entry date: %', 
            NEW.entry_date
            USING HINT = 'Period must be reopened by administrator';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger to journal_entries
DROP TRIGGER IF EXISTS trg_check_period_lock ON journal_entries;
CREATE TRIGGER trg_check_period_lock
    BEFORE INSERT OR UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION check_period_lock();

-- 5. Seed initial periods (current and previous year)
INSERT INTO accounting_periods (year, month, start_date, end_date, status)
SELECT 
    EXTRACT(YEAR FROM d)::INTEGER as year,
    EXTRACT(MONTH FROM d)::INTEGER as month,
    DATE_TRUNC('month', d)::DATE as start_date,
    (DATE_TRUNC('month', d) + INTERVAL '1 month' - INTERVAL '1 day')::DATE as end_date,
    CASE 
        WHEN d < DATE_TRUNC('month', NOW()) THEN 'closed'
        ELSE 'open'
    END as status
FROM generate_series(
    DATE_TRUNC('year', NOW() - INTERVAL '1 year'),
    DATE_TRUNC('year', NOW() + INTERVAL '1 year'),
    INTERVAL '1 month'
) d
ON CONFLICT (year, month) DO NOTHING;
```

#### Step 2: Create Closing Entry Procedure

**File:** `api/src/database/migrations/20260416_002_closing_entries.sql`

```sql
-- ============================================================================
-- Migration: Period Closing Automation
-- ============================================================================

-- 1. Create function to close a period
CREATE OR REPLACE FUNCTION public.close_accounting_period(
    p_year INTEGER,
    p_month INTEGER,
    p_closed_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_period_id UUID;
    v_start_date DATE;
    v_end_date DATE;
    v_retained_earnings UUID;
    v_total_revenue NUMERIC;
    v_total_expenses NUMERIC;
    v_net_income NUMERIC;
    v_journal_id UUID;
BEGIN
    -- Get period details
    SELECT id, start_date, end_date 
    INTO v_period_id, v_start_date, v_end_date
    FROM accounting_periods
    WHERE year = p_year AND month = p_month;

    IF v_period_id IS NULL THEN
        RAISE EXCEPTION 'Period %-% not found', p_year, p_month;
    END IF;

    -- Get retained earnings account
    SELECT id INTO v_retained_earnings
    FROM chart_of_accounts WHERE code = '3900'; -- Retained Earnings

    IF v_retained_earnings IS NULL THEN
        RAISE EXCEPTION 'Retained Earnings account (3900) not found';
    END IF;

    -- Calculate totals
    SELECT 
        COALESCE(SUM(CASE WHEN normal_balance = 'credit' THEN balance ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN normal_balance = 'debit' THEN balance ELSE 0 END), 0)
    INTO v_total_revenue, v_total_expenses
    FROM rpc_income_statement(v_start_date, v_end_date)
    WHERE is_computed = false;

    v_net_income := v_total_revenue - v_total_expenses;

    -- Create closing journal entry
    INSERT INTO journal_entries (
        entry_date, reference, description, source_type
    ) VALUES (
        v_end_date,
        format('CLOSE-%s-%s', p_year, LPAD(p_month::text, 2, '0')),
        format('Closing entries for %s-%s (Net Income: %s)', p_year, p_month, v_net_income),
        'period_close'
    ) RETURNING id INTO v_journal_id;

    -- Close revenue accounts (DR Revenue)
    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
    SELECT v_journal_id, account_id, balance, 0
    FROM rpc_income_statement(v_start_date, v_end_date)
    WHERE account_class = 'income' 
      AND balance > 0
      AND is_computed = false;

    -- Close expense accounts (CR Expense)
    INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
    SELECT v_journal_id, account_id, 0, balance
    FROM rpc_income_statement(v_start_date, v_end_date)
    WHERE account_class IN ('expense', 'cost_of_sales', 'finance_cost', 'admin_cost', 'operating_cost')
      AND balance > 0
      AND is_computed = false;

    -- Balance to retained earnings
    IF v_net_income > 0 THEN
        -- Profit: CR Retained Earnings
        INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
        VALUES (v_journal_id, v_retained_earnings, 0, v_net_income);
    ELSIF v_net_income < 0 THEN
        -- Loss: DR Retained Earnings
        INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
        VALUES (v_journal_id, v_retained_earnings, ABS(v_net_income), 0);
    END IF;

    -- Update period status
    UPDATE accounting_periods
    SET status = 'closed',
        closed_by = p_closed_by,
        closed_at = NOW(),
        notes = p_notes
    WHERE id = v_period_id;

    RETURN jsonb_build_object(
        'success', true,
        'period_id', v_period_id,
        'revenue', v_total_revenue,
        'expenses', v_total_expenses,
        'net_income', v_net_income,
        'closing_entry_id', v_journal_id
    );
END;
$$;

-- 2. Create reopen function (with audit trail)
CREATE OR REPLACE FUNCTION public.reopen_accounting_period(
    p_year INTEGER,
    p_month INTEGER,
    p_reopened_by UUID,
    p_reason TEXT
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_period_id UUID;
BEGIN
    IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
        RAISE EXCEPTION 'Reason required (min 10 characters) for reopening period';
    END IF;

    SELECT id INTO v_period_id
    FROM accounting_periods
    WHERE year = p_year AND month = p_month;

    IF v_period_id IS NULL THEN
        RAISE EXCEPTION 'Period %-% not found', p_year, p_month;
    END IF;

    UPDATE accounting_periods
    SET status = 'reopened',
        reopened_by = p_reopened_by,
        reopened_at = NOW(),
        reopen_reason = p_reason
    WHERE id = v_period_id;

    RETURN jsonb_build_object(
        'success', true,
        'period_id', v_period_id,
        'message', 'Period reopened. Closing entry must be reversed manually.'
    );
END;
$$;
```

#### Step 3: API Endpoints

**File:** `api/src/modules/accounting/accounting.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const { requirePermission } = require('../../middleware/rbac.middleware');

// Get all periods
router.get('/periods', async (req, res, next) => {
  try {
    const periods = await accountingService.getPeriods();
    res.json({ periods });
  } catch (err) { next(err); }
});

// Close a period
router.post('/periods/:year/:month/close', 
  requirePermission('close_accounting_periods'),
  async (req, res, next) => {
    try {
      const result = await accountingService.closePeriod(
        parseInt(req.params.year),
        parseInt(req.params.month),
        req.user.id,
        req.body.notes
      );
      res.json(result);
    } catch (err) { next(err); }
  }
);

// Reopen a period (requires reason)
router.post('/periods/:year/:month/reopen',
  requirePermission('reopen_accounting_periods'),
  async (req, res, next) => {
    try {
      const result = await accountingService.reopenPeriod(
        parseInt(req.params.year),
        parseInt(req.params.month),
        req.user.id,
        req.body.reason
      );
      res.json(result);
    } catch (err) { next(err); }
  }
);

module.exports = router;
```

### 4.4 Deployment Plan

| Week | Activity | Rollback |
|------|----------|----------|
| 1 | Deploy infrastructure (tables, triggers) | Drop table, disable trigger |
| 2 | Deploy closing procedures | Restore previous functions |
| 3 | Deploy API and UI | Revert code |
| 4 | Train users, go live | Manual period tracking |

---

## 5. TESTING STRATEGY

### 5.1 Unit Testing

```javascript
// Test: Void bill reverses revenue
describe('Bill Void Process', () => {
  it('should reverse revenue entry when bill is voided', async () => {
    // Create bill with round
    const bill = await createBillWithRound({ items: [...] });
    
    // Verify revenue entry exists
    const revenueEntries = await getRevenueEntries(bill.id);
    expect(revenueEntries).toHaveLength(1);
    
    // Void the bill
    await voidBill(bill.id);
    
    // Verify revenue reversal exists
    const reversals = await getRevenueReversals(bill.id);
    expect(reversals).toHaveLength(1);
    
    // Verify A/R balance is zero
    const arBalance = await getARBalance(bill.id);
    expect(arBalance).toBe(0);
  });
});
```

### 5.2 Integration Testing

1. **End-to-End Void Flow:**
   - Create bill → Add rounds → Verify journals → Void bill → Verify reversals

2. **Period Closing:**
   - Post transactions → Close period → Attempt posting (should fail) → Reopen → Post again

3. **Zero Cost Prevention:**
   - Create product with no receipts → Attempt sale → Should fail with clear message

### 5.3 Data Integrity Tests

```sql
-- Verify all voided bills have balanced reversals
SELECT b.id, b.status, 
       COALESCE(SUM(CASE WHEN je.source_type = 'round_sale' THEN jl.debit ELSE 0 END), 0) as revenue,
       COALESCE(SUM(CASE WHEN je.source_type = 'round_sale_reversal' THEN jl.credit ELSE 0 END), 0) as reversal
FROM bills b
JOIN rounds r ON r.bill_id = b.id
LEFT JOIN journal_entries je ON je.source_id = r.id 
LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
WHERE b.status = 'void'
GROUP BY b.id
HAVING revenue != reversal;
-- Should return 0 rows
```

---

## 6. ROLLBACK PROCEDURES

### 6.1 Phase 1 Rollback

```sql
-- If void fix causes issues:
-- 1. Restore original function (without revenue reversal)
CREATE OR REPLACE FUNCTION public.reverse_bill_sale(p_bill_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
-- Original version without revenue reversal
$$;

-- 2. Reverse backfill entries
DELETE FROM journal_lines 
WHERE journal_entry_id IN (
    SELECT id FROM journal_entries 
    WHERE source_type = 'round_sale_reversal'
    AND description LIKE '%backfill%'
);

DELETE FROM journal_entries 
WHERE source_type = 'round_sale_reversal'
AND description LIKE '%backfill%';
```

### 6.2 Phase 3 Rollback

```sql
-- Disable period locking
DROP TRIGGER IF EXISTS trg_check_period_lock ON journal_entries;

-- Allow posting to any period
UPDATE accounting_periods SET status = 'open';
```

---

## 7. MONITORING & VALIDATION

### 7.1 Post-Deployment Checks

```sql
-- Daily check for unreversed voided bills
SELECT COUNT(*) as alert_count
FROM bills b
WHERE b.status = 'void'
  AND EXISTS (
      SELECT 1 FROM rounds r
      JOIN journal_entries je ON je.source_id = r.id 
          AND je.source_type = 'round_sale'
          AND je.reversed_entry_id IS NULL
      WHERE r.bill_id = b.id
  );

-- Daily check for zero-cost sales
SELECT DATE(created_at) as date, COUNT(*) as zero_cost_count
FROM system_warnings
WHERE warning_type = 'ZERO_COST_SALE'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at);

-- Period status check
SELECT year, month, status, closed_by, closed_at
FROM accounting_periods
WHERE status != 'open'
ORDER BY year, month;
```

### 7.2 Success Metrics

| Metric | Before | Target After |
|--------|--------|--------------|
| Unreversed voided bills | >0 | 0 |
| A/R balance accuracy | Inflated | Accurate |
| Zero-cost sales | Allowed | Blocked |
| Period violations | N/A | 0 |

---

## 8. TRAINING & DOCUMENTATION

### 8.1 User Training

| Role | Training Topics | Duration |
|------|----------------|----------|
| Cashiers | Zero-cost error messages | 30 min |
| Managers | Period closing procedures | 1 hour |
| Accountants | Reopening periods, adjustments | 2 hours |

### 8.2 Documentation Updates

- Update SOP for voiding bills
- Create period-end closing checklist
- Document zero-cost resolution process

---

## 9. TIMELINE SUMMARY

```
Week 1: Phase 1 Implementation
  Day 1-2: Develop void fix
  Day 3:   Staging testing
  Day 4:   Production deployment
  Day 5:   Backfill + verification

Week 2: Phase 1 Monitoring
  Monitor daily for issues
  Fix any edge cases

Week 3: Phase 2 Implementation
  Deploy warning mode
  Identify affected products
  Fix data issues

Week 4: Phase 2 Enforcement
  Deploy enforcement mode
  Monitor blocks

Week 5-6: Phase 3 Implementation
  Deploy period infrastructure
  Test closing procedures
  Train users

Week 7: Go-Live Support
  Monitor all systems
  Address user questions
```

---

**Document Owner:** Finance & Engineering Teams  
**Approval Required:** CFO, CTO, Head of Engineering  
**Next Review Date:** Post-implementation (May 2026)
