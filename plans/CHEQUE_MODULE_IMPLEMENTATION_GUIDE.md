# Cheque Module Implementation Guide - ERP Integration

**Document Date:** March 26, 2026  
**Status:** Ready for Implementation

---

## 📦 Files Created

### 1. Database Migration
**File:** `api/src/database/migrations/20260326_003_cheque_cache_invalidation.sql`

**Contains:**
- `financial_data_changes` table - Tracks changes for cache invalidation
- `log_financial_change()` function - Logs changes programmatically
- `trg_log_journal_change` trigger - Auto-logs on journal entry changes
- `v_cheque_journal_linkage` view - Verification of cheque-journal linkage
- `rpc_get_cheque_details()` function - Detailed cheque query with journal lines
- `validate_cheque_accounts()` function - Pre-validation of accounts

### 2. Updated Service Layer
**File:** `api/src/modules/cheques/cheques.service.v2.js`

**Key Features:**
- ✅ Cache invalidation on create/clear/void
- ✅ `getDetailed()` method with full journal info
- ✅ `validateAccounts()` helper
- ✅ `getLinkageReport()` for debugging
- ✅ WebSocket broadcast support

### 3. Updated Controller
**File:** `api/src/modules/cheques/cheques.controller.v2.js`

**Key Features:**
- ✅ `X-Cache-Invalidated` response headers
- ✅ `validateAccounts` endpoint
- ✅ `getLinkageReport` endpoint
- ✅ Real-time SSE subscription endpoint
- ✅ Proper audit logging

### 4. Updated Routes
**File:** `api/src/modules/cheques/cheques.routes.v2.js`

**New Endpoints:**
- `GET /api/cheques/linkage-report` - Debug report
- `POST /api/cheques/validate-accounts` - Pre-validation
- `GET /api/cheques/stream/updates` - Real-time updates

### 5. Frontend Hooks
**File:** `erp/src/hooks/useChequeMutations.js`

**Features:**
- ✅ Automatic cache invalidation after mutations
- ✅ Toast notifications
- ✅ `invalidateFinancialData()` helper

---

## 🔧 Implementation Steps

### Step 1: Deploy Database Migration

```bash
# Run the migration
cd api
npx migrate create 20260326_003_cheque_cache_invalidation
# Copy contents from: api/src/database/migrations/20260326_003_cheque_cache_invalidation.sql
npx migrate up
```

**Verify:**
```sql
-- Check table exists
SELECT * FROM financial_data_changes LIMIT 1;

-- Check view works
SELECT * FROM v_cheque_journal_linkage LIMIT 5;

-- Test validation function
SELECT * FROM validate_cheque_accounts(
  'YOUR_CASH_ACCOUNT_UUID'::uuid,
  'YOUR_KCB_ACCOUNT_UUID'::uuid
);
```

### Step 2: Update Backend Code

#### Option A: Replace Files (Backup First)
```bash
cd api/src/modules/cheques

# Backup originals
cp cheques.service.js cheques.service.js.backup
cp cheques.controller.js cheques.controller.js.backup
cp cheques.routes.js cheques.routes.js.backup

# Copy new versions
cp cheques.service.v2.js cheques.service.js
cp cheques.controller.v2.js cheques.controller.js
cp cheques.routes.v2.js cheques.routes.js
```

#### Option B: Manual Merge (Recommended)
Merge the new functions into existing files:

**In `cheques.service.js`, add:**
```javascript
// Add at top
const getSupabase = require("../../config/supabase");

// Add after existing functions
exports.getDetailed = async (id) => { ... };
exports.validateAccounts = async (bankAccountId, debitAccountId) => { ... };
exports.getLinkageReport = async (filters = {}) => { ... };

// Update existing create/clear/void to include cache invalidation
```

### Step 3: Update Frontend

**Copy the hook file:**
```bash
cp erp/src/hooks/useChequeMutations.js YOUR_ERP_PATH/src/hooks/
```

**Create/update ChequesService in your ERP:**
```javascript
// erp/src/api/services/cheques.service.js
export const ChequesService = {
  async list(params) { ... },
  async getById(id) { ... },
  async create(payload) { ... },
  async clear(id) { ... },
  async void(id) { ... },
  async validateAccounts(bankId, debitId) { ... },
  async getLinkageReport(filters) { ... },
};
```

### Step 4: Update React Components

**Replace useCheques with useChequeMutations:**

```javascript
// OLD
import { useCheques } from '@/hooks/useCheques';
const { createCheque } = useCheques();

// NEW
import { useChequeMutations } from '@/hooks/useChequeMutations';
const { createCheque } = useChequeMutations();
```

**Update Balance Sheet component to listen for cache invalidation:**

```javascript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const BalanceSheet = () => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Listen for cache invalidation events
    const handleCacheInvalidated = () => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
    };
    
    window.addEventListener('financial:data:changed', handleCacheInvalidated);
    return () => window.removeEventListener('financial:data:changed', handleCacheInvalidated);
  }, [queryClient]);
  
  // ... rest of component
};
```

### Step 5: Test Integration

**Test 1: Create Transfer**
1. Open Balance Sheet - note Cash on Hand balance
2. Create transfer from Cash on Hand to KCB
3. Check Balance Sheet - should update automatically

**Test 2: Void Cheque**
1. Create a cheque
2. Note balance changes
3. Void the cheque
4. Balances should revert

**Test 3: Cache Headers**
```bash
curl -X POST /api/cheques \
  -H "Authorization: Bearer TOKEN" \
  -d '{"cheque_number":"TEST001",...}' \
  -i

# Should see in response:
# X-Cache-Invalidated: true
# X-Affected-Accounts: uuid1,uuid2
```

---

## 🔍 Debugging Tools

### Check Cheque-Journal Linkage
```sql
-- View all cheques and their journal status
SELECT 
  cheque_number,
  transaction_type,
  amount,
  status,
  has_journal,
  has_reversal,
  bank_account_code,
  debit_account_code
FROM v_cheque_journal_linkage
ORDER BY cheque_date DESC
LIMIT 20;
```

### Check for Unlinked Cheques
```sql
-- Find cheques without journals (data integrity issue)
SELECT * FROM v_cheque_journal_linkage
WHERE has_journal = false
ORDER BY created_at DESC;
```

### Monitor Cache Invalidation
```sql
-- See recent financial data changes
SELECT 
  change_type,
  entity_type,
  affected_accounts,
  change_timestamp,
  processed
FROM financial_data_changes
ORDER BY change_timestamp DESC
LIMIT 10;
```

---

## 📊 Expected Behavior After Fix

| Action | Before Fix | After Fix |
|--------|-----------|-----------|
| Create Transfer | Balance sheet needs manual refresh | Auto-updates within seconds |
| Void Cheque | Old balance persists | Immediately shows corrected balance |
| Clear Cheque | Status updates, balance doesn't | Both status and balance update |
| View Cheque Detail | Basic info only | Full journal entry details included |

---

## 🚀 Performance Considerations

1. **Cache Invalidation is Async** - Won't block the main transaction
2. **Financial Data Changes Table** - Should be cleaned periodically:
   ```sql
   -- Run weekly
   DELETE FROM financial_data_changes 
   WHERE change_timestamp < NOW() - INTERVAL '7 days';
   ```

3. **Indexes Added** - The migration adds indexes for faster lookups

---

## ⚠️ Rollback Plan

If issues occur:

```sql
-- Disable trigger
DROP TRIGGER IF EXISTS trg_log_journal_change ON journal_entries;

-- Revert to old functions (restore from backup)
-- Or disable cache invalidation in code
```

---

## ✅ Verification Checklist

- [ ] Migration runs successfully
- [ ] `v_cheque_journal_linkage` returns data
- [ ] `validate_cheque_accounts` works
- [ ] Creating transfer shows `X-Cache-Invalidated` header
- [ ] Frontend cache invalidates automatically
- [ ] Balance sheet updates without manual refresh
- [ ] Voided cheques show correct reversed balances
- [ ] Linkage report shows all cheques with `has_journal = true`

---

Need help with any step? Share the error message or behavior you're seeing.
