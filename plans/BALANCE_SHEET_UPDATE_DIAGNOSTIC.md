# Balance Sheet Not Updating - Real-Time Diagnostic

**Report Date:** March 26, 2026  
**Issue:** Balance sheet not reflecting new transactions in real-time

---

## 🔴 CRITICAL FINDING

**Data Storage:** ✅ Working (Journals created)  
**Data Retrieval:** ❌ NOT Working (Balance sheet stale)

---

## 1. IMMEDIATE DIAGNOSTIC CHECKS

### Check 1: Verify Journal Entry is Queryable

Run this **RIGHT NOW** while the issue is happening:

```sql
-- Check if the journal entry is actually committed
SELECT 
    je.id,
    je.entry_date,
    je.created_at,
    je.source_type,
    je.source_id,
    jl.account_id,
    coa.code,
    jl.debit,
    jl.credit
FROM journal_entries je
JOIN journal_lines jl ON jl.journal_entry_id = je.id
JOIN chart_of_accounts coa ON coa.id = jl.account_id
WHERE je.reference = 'TRF-232'  -- The transfer reference
   OR je.id = '843968f5-25f7-4e48-9986-0b6aab046f76'  -- The journal ID
ORDER BY jl.debit DESC;
```

**Expected:** 2 rows showing the transfer  
**If no rows:** Transaction not committed  
**If rows exist:** Transaction is in DB, issue is with balance sheet query

---

### Check 2: Test Balance Sheet with EXACT Date

```sql
-- Test with today's date
SELECT * FROM rpc_balance_sheet('2026-03-26'::date)
WHERE account_code IN ('1010', '1020');

-- Test with yesterday's date
SELECT * FROM rpc_balance_sheet('2026-03-25'::date)
WHERE account_code IN ('1010', '1020');

-- Test with future date
SELECT * FROM rpc_balance_sheet('2026-03-27'::date)
WHERE account_code IN ('1010', '1020');
```

**Compare the results:**
- If 25th and 26th show SAME balance → Transaction not included
- If 26th and 27th show SAME balance as 26th → Transaction included

**Question:** What date is your ERP passing to `rpc_balance_sheet`?

---

### Check 3: Manual Balance Calculation

```sql
-- Calculate balance manually for Cash on Hand
SELECT 
    'Manual Calculation' as source,
    coa.code,
    coa.name,
    SUM(jl.debit) as total_debits,
    SUM(jl.credit) as total_credits,
    SUM(jl.debit - jl.credit) as calculated_balance
FROM chart_of_accounts coa
LEFT JOIN journal_lines jl ON jl.account_id = coa.id
LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE coa.code = '1010'  -- Cash on Hand
  AND je.entry_date <= '2026-03-26'
GROUP BY coa.id, coa.code, coa.name;

-- Compare with RPC
SELECT 
    'RPC Balance Sheet' as source,
    account_code,
    account_name,
    NULL as total_debits,
    NULL as total_credits,
    balance
FROM rpc_balance_sheet('2026-03-26')
WHERE account_code = '1010';
```

**Do the balances match?**
- If YES → Issue is in frontend caching
- If NO → Issue is in RPC function

---

### Check 4: Check for Pending Transactions

```sql
-- Are there any uncommitted or pending transactions?
SELECT 
    count(*) as total_entries,
    max(created_at) as latest_entry
FROM journal_entries
WHERE created_at >= '2026-03-26';

-- Check if Supabase has any replication lag
SELECT 
    now() as server_time,
    max(created_at) as last_journal_created
FROM journal_entries;
```

---

### Check 5: Frontend/Network Diagnostic

If you're using Supabase from the frontend:

```javascript
// In your browser console, run this:

// 1. Check if Supabase client has caching
const { data: bs1, error: err1 } = await supabase
  .rpc('rpc_balance_sheet', { p_as_of_date: '2026-03-26' });
console.log('First call:', bs1.find(a => a.account_code === '1010'));

// Wait 5 seconds, call again
setTimeout(async () => {
  const { data: bs2, error: err2 } = await supabase
    .rpc('rpc_balance_sheet', { p_as_of_date: '2026-03-26' });
  console.log('Second call:', bs2.find(a => a.account_code === '1010'));
}, 5000);
```

**If both return same data but you just made a transfer:**
- Supabase might be caching RPC results
- Or your frontend is caching

---

## 2. COMMON CAUSES & SOLUTIONS

### Cause 1: Frontend Caching (Most Likely)

**Symptom:** React Query / TanStack Query caching old data

**Evidence:** Network tab shows no new API call when refreshing balance sheet

**Fix (React Query):**
```javascript
// In your balance sheet hook
const { data } = useQuery({
  queryKey: ['balance-sheet', asOfDate],
  queryFn: () => fetchBalanceSheet(asOfDate),
  staleTime: 0,        // ← Don't cache
  cacheTime: 0,        // ← Don't cache
  refetchOnWindowFocus: true,
});
```

**Fix (SWR):**
```javascript
const { data } = useSWR(
  ['/api/balance-sheet', asOfDate],
  fetcher,
  { revalidateOnFocus: true, dedupingInterval: 0 }
);
```

---

### Cause 2: Supabase Client Caching

**Symptom:** Same Supabase client instance returning cached data

**Fix:**
```javascript
// Force fresh data
const { data } = await supabase
  .rpc('rpc_balance_sheet', { p_as_of_date: '2026-03-26' })
  .abortSignal(new AbortController().signal) // Bypass cache
  .single();
```

Or use `auth` role instead of `anon`:
```javascript
// Use service_role or authenticated role
const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false }
});
```

---

### Cause 3: Date Parameter Mismatch

**Symptom:** ERP passing wrong date to balance sheet

**Evidence:** 
```sql
-- Check what date ERP is using
-- If ERP sends '2026-03-25' instead of '2026-03-26',
-- today's transactions won't appear
```

**Fix:** Check your React/Vue component:
```javascript
// What is this value?
const asOfDate = new Date();  // This includes time, might cause issues

// Should be:
const asOfDate = new Date().toISOString().split('T')[0];  // Just date
```

---

### Cause 4: Materialized View Not Refreshed

**Check if balance sheet uses materialized view:**
```sql
-- Check if any materialized views exist
SELECT 
    schemaname,
    matviewname,
    hasindexes,
    ispopulated
FROM pg_matviews
WHERE matviewname LIKE '%balance%' OR matviewname LIKE '%sheet%';
```

**If found, refresh:**
```sql
REFRESH MATERIALIZED VIEW your_balance_sheet_view;
```

---

### Cause 5: Row Level Security (RLS) Blocking

**Check if RLS is filtering results:**
```sql
-- Check RLS policies on journal_entries
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('journal_entries', 'journal_lines', 'chart_of_accounts');
```

**Test with superuser:**
```sql
-- Run as postgres superuser
SET ROLE postgres;
SELECT * FROM rpc_balance_sheet('2026-03-26') WHERE account_code = '1010';
RESET ROLE;
```

**Compare results:** If different, RLS is the issue.

---

## 3. REAL-TIME TEST PROCEDURE

### Step 1: Open Two Windows

**Window A: SQL Editor (Supabase Dashboard)**
```sql
-- Run this continuously
SELECT code, name, balance 
FROM rpc_balance_sheet('2026-03-26') 
WHERE account_code IN ('1010', '1020');
```

**Window B: ERP Frontend**
- Navigate to Balance Sheet
- Note current balances

### Step 2: Make a Test Transfer

In ERP:
- Create a cheque transfer for a UNIQUE amount (e.g., 123,456)
- From: Cash on Hand
- To: KCB Account

### Step 3: Check Both Windows

**Window A (SQL):**
```sql
-- Immediately after transfer
SELECT * FROM rpc_balance_sheet('2026-03-26') WHERE account_code IN ('1010', '1020');
```

**Did the balances change?**
- ✅ YES → Backend is working, frontend is caching
- ❌ NO → Backend has issue (journal not created or RPC broken)

### Step 4: Verify Journal Creation

```sql
-- Check if journal exists
SELECT * FROM journal_entries 
WHERE source_type = 'cheque' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 4. FRONTEND DEBUG CHECKLIST

If using React/Vue/Angular:

- [ ] Open Browser DevTools → Network tab
- [ ] Clear network log
- [ ] Refresh balance sheet
- [ ] **Look for:** `rpc_balance_sheet` API call
- [ ] **Check:** Is the request being made?
- [ ] **Check:** What date parameter is sent?
- [ ] **Check:** What response is received?

### Expected Network Call:
```
POST https://your-project.supabase.co/rest/v1/rpc/rpc_balance_sheet
Body: { "p_as_of_date": "2026-03-26" }
```

### Expected Response:
```json
[
  {
    "account_code": "1010",
    "account_name": "Cash on Hand",
    "balance": -1992324
  },
  {
    "account_code": "1020",
    "account_name": "KCB Account",
    "balance": 932685
  }
]
```

---

## 5. QUICK FIXES TO TRY

### Fix 1: Hard Refresh
```javascript
// Force reload bypassing cache
window.location.reload(true);
```

### Fix 2: Clear React Query Cache
```javascript
// In browser console
queryClient.invalidateQueries(['balance-sheet']);
queryClient.clear();
```

### Fix 3: Add Cache-Buster
```javascript
// Add timestamp to force fresh data
const { data } = await supabase
  .rpc('rpc_balance_sheet', { 
    p_as_of_date: '2026-03-26',
    _cache_buster: Date.now()  // Add unused param to bust cache
  });
```

### Fix 4: Check Date Format
```javascript
// Ensure correct date format
const dateStr = new Date().toISOString().split('T')[0]; // "2026-03-26"
// NOT: new Date().toString() or new Date().toLocaleDateString()
```

---

## 6. MOST LIKELY CAUSE

Based on your symptoms (data exists but balance sheet doesn't update), the most likely causes are:

| Rank | Cause | Likelihood | Quick Test |
|------|-------|-----------|------------|
| 1 | **Frontend caching** (React Query/SWR) | 80% | Hard refresh (Ctrl+F5) fixes it |
| 2 | **Wrong date parameter** | 15% | Check Network tab for date value |
| 3 | **Supabase RPC caching** | 5% | Check Supabase dashboard logs |

---

## 7. ACTION ITEMS

1. **Run Check 1** - Confirm journal entry exists
2. **Run Check 2** - Test balance sheet with different dates
3. **Open Browser DevTools** - Check Network tab for actual API call
4. **Try Hard Refresh** - Ctrl+F5 or Cmd+Shift+R
5. **Report back:**
   - Does hard refresh fix it?
   - What date is being sent to RPC?
   - Does SQL query show updated balance immediately?

---

**Bottom line:** The data IS in the database. The issue is between the database and your screen (caching or date mismatch).
