# Balance Sheet Accounts Payable Fix

## Problem
The Balance Sheet was not showing Accounts Payable (AP) accounts for suppliers, even after implementing the supplier AP account feature.

## Root Cause
The `rpc_balance_sheet` database function had a restrictive `HAVING` clause that filtered out:
- Child accounts with zero activity (no journal entries)
- Non-control accounts that were children of parent accounts

Since supplier AP accounts (210101, 210102, etc.) are:
1. Children of Trade Payables (2100) parent
2. Often have zero balance (until purchases are made)

They were being hidden by this filter.

## Solution

### 1. Database Migration (`20260316_004_fix_balance_sheet_show_all_accounts.sql`)

**Changes:**
- **Removed** the restrictive `HAVING` clause from `rpc_balance_sheet`
- **Updated** `rpc_trial_balance` for consistency
- **Added** a debug view `v_balance_sheet_account_visibility` to help troubleshoot account visibility issues

**Before:**
```sql
HAVING COALESCE(SUM(ABS(jl.debit) + ABS(jl.credit)), 0) != 0
    OR coa.parent_id IS NULL
    OR coa.is_control_account = true
```

**After:**
```sql
-- Removed entirely - now shows ALL balance sheet accounts
```

### 2. Frontend Enhancement (`BalanceSheetPage.jsx`)

**Changes:**
- Added `hideZeroBalance` state toggle
- Added `filterZeroBalance()` helper function
- Added UI checkbox to show/hide zero-balance accounts
- Updated account class filtering to include generic `'liability'` class

**New Feature:**
- Users can now toggle "Hide zero balances" to clean up the view
- All accounts are returned from API, frontend handles filtering

## How to Apply

### Step 1: Run the Migration

```bash
cd api
node src/database/migrate.js
```

Or run the SQL directly in Supabase SQL Editor:
```sql
\i api/src/database/migrations/20260316_004_fix_balance_sheet_show_all_accounts.sql
```

### Step 2: Verify the Fix

Run these queries to verify AP accounts are now visible:

```sql
-- Check AP accounts in balance sheet
SELECT * FROM rpc_balance_sheet(CURRENT_DATE) 
WHERE account_code LIKE '2100%';

-- Should show Trade Payables (2100) and all supplier subaccounts (210101, etc.)
```

### Step 3: Refresh the Frontend

The frontend changes are automatically applied. Users will see:
- A new "Hide zero balances" checkbox in the Balance Sheet header
- All AP accounts including supplier subaccounts

## Verification Checklist

- [ ] Migration runs without errors
- [ ] `rpc_balance_sheet` returns accounts with code `2100%`
- [ ] Balance Sheet page shows Trade Payables (2100)
- [ ] Balance Sheet page shows supplier AP accounts (210101, 210102, etc.)
- [ ] "Hide zero balances" toggle works correctly
- [ ] Trial Balance still works correctly

## Troubleshooting

### Still not seeing AP accounts?

1. **Check account classes exist:**
```sql
SELECT * FROM account_classes WHERE code = 'current_liability';
```

2. **Check AP accounts have correct class:**
```sql
SELECT code, name, account_class 
FROM chart_of_accounts 
WHERE code LIKE '2100%';
-- Should show 'current_liability' for all
```

3. **Check supplier links:**
```sql
SELECT s.name, s.account_id, coa.code, coa.name
FROM suppliers s
JOIN chart_of_accounts coa ON coa.id = s.account_id;
```

4. **Use the debug view:**
```sql
SELECT * FROM v_balance_sheet_account_visibility 
WHERE code LIKE '2100%';
```

## Related Files

- `api/src/database/migrations/20260316_004_fix_balance_sheet_show_all_accounts.sql`
- `erp/src/pages/BalanceSheetPage.jsx`
- `api/src/database/functions.sql` (RPC definitions)
