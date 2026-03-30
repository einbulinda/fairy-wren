# Data Flow Diagnostic Report - Interconnectivity Issues

**Report Date:** March 26, 2026  
**Focus:** Cheque transfers, Bank Account balances, General Ledger integration

---

## 1. YOUR ASSUMPTION IS CORRECT ✅

**Financial statements MUST extract from the general ledger.**
- Source of truth: `journal_entries` + `journal_lines`
- All transactions should create journal entries
- Balance sheet, Income Statement, Trial Balance all read from these tables

---

## 2. IDENTIFIED CRITICAL ISSUE: Missing `bank` Account Class

### The Problem
Your `account_classes` lookup table is **MISSING** the `bank` class:

**From migration `20260312_001_lookup_tables.sql`:**
```sql
INSERT INTO account_classes (code, label, category, sort_order) VALUES
    ('asset',                  'Asset',                  'asset',     1),
    ('current_asset',          'Current Asset',          'asset',     2),
    ('non_current_asset',      'Non-Current Asset',      'asset',     3),
    ('liability',              'Liability',              'liability', 10),
    ('current_liability',      'Current Liability',      'liability', 11),
    ('non_current_liability',  'Non-Current Liability',  'liability', 12),
    ('equity',                 'Equity',                 'equity',    20),
    ('income',                 'Income',                 'income',    30),
    ('expense',                'Expense',                'expense',   40),
    ('cost_of_sales',          'Cost of Sales',          'expense',   41),
    ('finance_cost',           'Finance Cost',           'expense',   42),
    ('admin_cost',             'Admin Cost',             'expense',   43),
    ('operating_cost',         'Operating Cost',         'expense',   44)
    -- MISSING: ('bank', 'Bank Account', 'asset', 4)
```

### Impact
1. Bank accounts in `chart_of_accounts` **CANNOT** use `account_class = 'bank'` (FK constraint violation)
2. They probably use `account_class = 'current_asset'` instead
3. The balance sheet function includes 'bank' in the filter, but since the class doesn't exist, it has no effect
4. **However**, if your bank accounts use 'current_asset', they SHOULD appear

---

## 3. DATA FLOW ARCHITECTURE ANALYSIS

### Current Flow for Cheque Transfer

```
User Action: Transfer from "Cash on Hand" to "KCB Bank"
                    ↓
            Cheque Service (cheques.service.js)
                    ↓
        Creates Journal Entry:
        DR debit_account_id (KCB Bank)    XXX
            CR bank_account_id (Cash on Hand) XXX
                    ↓
        Stored in: journal_entries + journal_lines
                    ↓
        Balance Sheet Query (rpc_balance_sheet)
        Reads from journal_lines WHERE account_id = [bank accounts]
                    ↓
        Display in ERP
```

### Expected Journal Entry for Transfer

When you transfer from Cash on Hand to KCB Bank:
```
Journal Entry: TRF-001
Date: [today]

Account                    Debit      Credit
-------------------------------------------
KCB Bank (destination)     XXX
    Cash on Hand (source)             XXX
```

**Both accounts should be:**
- In `chart_of_accounts`
- With `account_class = 'current_asset'` (since 'bank' doesn't exist)
- Active = true

---

## 4. DIAGNOSTIC QUERIES

Run these queries to identify the exact issue:

### Query 1: Check Account Classes
```sql
-- See what classes exist
SELECT code, label, category, active 
FROM account_classes 
ORDER BY sort_order;

-- Is 'bank' missing?
SELECT COUNT(*) as bank_class_exists 
FROM account_classes 
WHERE code = 'bank';
```

### Query 2: Check Your Bank Accounts
```sql
-- See how your bank accounts are classified
SELECT 
    coa.id,
    coa.code,
    coa.name,
    coa.account_class,
    coa.active,
    coa.normal_balance
FROM chart_of_accounts coa
WHERE coa.name ILIKE '%cash%' 
   OR coa.name ILIKE '%bank%'
   OR coa.name ILIKE '%kcb%'
ORDER BY coa.code;
```

### Query 3: Check Recent Cheque Journal Entries
```sql
-- See if cheque transfers are creating journal entries
SELECT 
    je.id,
    je.entry_date,
    je.reference,
    je.description,
    je.source_type,
    c.cheque_number,
    c.transaction_type,
    c.amount as cheque_amount,
    jl.account_id,
    coa.code as account_code,
    coa.name as account_name,
    jl.debit,
    jl.credit
FROM journal_entries je
JOIN cheques c ON c.id = je.source_id AND je.source_type = 'cheque'
JOIN journal_lines jl ON jl.journal_entry_id = je.id
JOIN chart_of_accounts coa ON coa.id = jl.account_id
WHERE je.entry_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY je.entry_date DESC, je.id, jl.debit DESC;
```

### Query 4: Check Balance Sheet Output for Bank Accounts
```sql
-- See what balance sheet shows for your bank accounts
SELECT * FROM rpc_balance_sheet(CURRENT_DATE)
WHERE account_name ILIKE '%cash%' 
   OR account_name ILIKE '%bank%'
   OR account_name ILIKE '%kcb%'
ORDER BY account_code;
```

### Query 5: Check Account Ledger for Bank Account
```sql
-- Detailed ledger for a specific bank account (replace with your account ID)
SELECT * FROM rpc_account_ledger(
    'YOUR_BANK_ACCOUNT_UUID'::uuid,  -- Replace with actual account ID
    '2026-01-01'::date,
    CURRENT_DATE
)
ORDER BY entry_date;
```

### Query 6: Verify Journal Balance
```sql
-- Ensure all cheque journals are balanced
SELECT 
    je.id,
    je.reference,
    SUM(jl.debit) as total_debits,
    SUM(jl.credit) as total_credits,
    CASE WHEN SUM(jl.debit) = SUM(jl.credit) THEN 'BALANCED' ELSE 'UNBALANCED!' END as status
FROM journal_entries je
JOIN journal_lines jl ON jl.journal_entry_id = je.id
WHERE je.source_type = 'cheque'
  AND je.entry_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY je.id, je.reference
HAVING SUM(jl.debit) != SUM(jl.credit);
-- Should return 0 rows
```

---

## 5. LIKELY ROOT CAUSES

### Scenario A: Bank Accounts Use Wrong Account Class
**Symptom:** Bank accounts classified as something other than 'current_asset' or 'bank'

**Fix:**
```sql
-- Check current classification
SELECT code, name, account_class FROM chart_of_accounts 
WHERE name ILIKE '%kcb%' OR name ILIKE '%cash%';

-- Update if needed (example for KCB Bank)
UPDATE chart_of_accounts 
SET account_class = 'current_asset',
    normal_balance = 'debit'
WHERE code = 'YOUR_KCB_CODE';
```

### Scenario B: Journal Entries Not Created
**Symptom:** Cheques exist but no journal_entries with source_type = 'cheque'

**Check:**
```sql
-- Count cheques vs journal entries
SELECT 
    (SELECT COUNT(*) FROM cheques WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as cheque_count,
    (SELECT COUNT(*) FROM journal_entries WHERE source_type = 'cheque' AND created_at >= CURRENT_DATE - INTERVAL '7 days') as journal_count;
```

If `cheque_count > journal_count`, the cheque service is failing to create journals.

### Scenario C: Accounts Inactive
**Symptom:** Bank accounts marked as inactive

**Check:**
```sql
SELECT code, name, active FROM chart_of_accounts 
WHERE name ILIKE '%bank%' OR name ILIKE '%cash%';
```

Balance sheet only shows `active = true` accounts.

### Scenario D: Balance Sheet Cache/Stale Data
**Symptom:** Database has correct data but UI shows old data

**Fix:**
- Check if frontend caches balance sheet
- Verify date parameter in RPC call
- Try hard refresh or different date

---

## 6. IMMEDIATE FIXES REQUIRED

### Fix 1: Add Missing `bank` Account Class

```sql
-- Add bank account class
INSERT INTO account_classes (code, label, category, sort_order)
VALUES ('bank', 'Bank Account', 'asset', 4)
ON CONFLICT (code) DO NOTHING;

-- Verify
SELECT * FROM account_classes WHERE code = 'bank';
```

### Fix 2: Update Bank Accounts to Use 'bank' Class

```sql
-- Update your bank accounts (customize codes as needed)
UPDATE chart_of_accounts 
SET account_class = 'bank',
    normal_balance = 'debit'
WHERE code IN ('1010', '1020', 'YOUR_KCB_CODE');  -- Replace with your actual bank account codes

-- Or update by name pattern
UPDATE chart_of_accounts 
SET account_class = 'bank',
    normal_balance = 'debit'
WHERE name ILIKE '%bank%' 
   OR name ILIKE '%kcb%'
   OR name ILIKE '%mpesa%'
   OR (name ILIKE '%cash%' AND code LIKE '10%');  -- Cash accounts in 1000s range
```

### Fix 3: Verify Cheque Journal Creation

Check the cheque service is working:
```javascript
// Add logging to cheques.service.js in create() method
console.log('Creating cheque journal entry:', {
  bank_account_id: dto.bank_account_id,
  debit_account_id: dto.debit_account_id,
  amount: dto.amount
});
```

### Fix 4: Fix Balance Sheet Function

The balance sheet should include accounts by category, not just class:

```sql
-- Updated rpc_balance_sheet that includes all asset accounts
CREATE OR REPLACE FUNCTION public.rpc_balance_sheet(p_as_of_date date) 
RETURNS TABLE (...) AS $$
SELECT 
    coa.id AS account_id,
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
WHERE (
    -- Include by account_class
    coa.account_class IN (
        'asset', 'current_asset', 'non_current_asset', 'bank',
        'liability', 'current_liability', 'non_current_liability',
        'equity'
    )
    -- OR include by category (from account_classes)
    OR coa.account_class IN (
        SELECT code FROM account_classes 
        WHERE category IN ('asset', 'liability', 'equity')
    )
)
AND coa.active = true
GROUP BY coa.id, coa.code, coa.name, coa.account_class,
         coa.parent_id, coa.normal_balance, coa.is_control_account
ORDER BY coa.code;
$$ LANGUAGE sql STABLE;
```

---

## 7. VERIFICATION CHECKLIST

After fixes, verify:

- [ ] Run Query 1 - `bank` class exists in account_classes
- [ ] Run Query 2 - Bank accounts have correct account_class
- [ ] Run Query 3 - Cheque journals are being created
- [ ] Run Query 4 - Balance sheet shows bank accounts
- [ ] Run Query 5 - Account ledger shows transactions
- [ ] Run Query 6 - All journals are balanced
- [ ] Create test transfer - verify balance updates correctly
- [ ] Check balance sheet before and after transfer

---

## 8. RECOMMENDED ARCHITECTURE IMPROVEMENTS

### 1. Cash Accounts Module
Create proper API for cash_accounts table:
```javascript
// api/src/modules/cash-accounts/cash-accounts.service.js
exports.list = async () => {
  return supabase
    .from('cash_accounts')
    .select('*, gl_account:gl_account_id(*)')
    .eq('active', true);
};
```

### 2. Account Class Validation
Add validation when creating accounts:
```javascript
// Ensure bank accounts use 'bank' class
if (accountType === 'bank' && dto.account_class !== 'bank') {
  throw new Error('Bank accounts must use account_class = "bank"');
}
```

### 3. Automated Reconciliation
Create view to compare cash_accounts balance vs GL balance:
```sql
CREATE VIEW v_bank_reconciliation AS
SELECT 
    ca.id as cash_account_id,
    ca.name as account_name,
    ca.gl_account_id,
    COALESCE(SUM(jl.debit - jl.credit), 0) as gl_balance
FROM cash_accounts ca
LEFT JOIN journal_lines jl ON jl.account_id = ca.gl_account_id
LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE ca.active = true
GROUP BY ca.id, ca.name, ca.gl_account_id;
```

---

## 9. SUMMARY

| Issue | Severity | Fix |
|-------|----------|-----|
| Missing 'bank' account class | HIGH | Insert into account_classes |
| Bank accounts misclassified | HIGH | Update chart_of_accounts |
| No cash_accounts API | MEDIUM | Create module |
| Potential journal creation failure | MEDIUM | Add logging/validation |

**Your next steps:**
1. Run the diagnostic queries (Section 4)
2. Apply Fix 1 (Add bank class)
3. Apply Fix 2 (Update bank accounts)
4. Verify with Query 4
5. Report back which query showed the issue

This will pinpoint exactly where the data flow is breaking.
