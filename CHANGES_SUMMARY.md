# Changes Summary by Application

## Quick Reference Guide

---

## 🔴 API Application (`api/`)

### New Files to Create

| File | Purpose | Lines |
|------|---------|-------|
| `src/middleware/userRateLimiter.js` | Per-user rate limiting | ~50 |
| `src/middleware/requestSigner.js` | HMAC request verification | ~45 |
| `src/middleware/performanceMonitor.js` | API performance tracking | ~35 |
| `src/middleware/audit.middleware.js` | Comprehensive audit logging | ~80 |

### Files to Modify

| File | Changes | Impact |
|------|---------|--------|
| `src/app.js` | Add security headers, user rate limiter, request signer, performance monitor | Security & Observability |
| `src/modules/bills/bills.service.js` | Add broadcastChange() calls for real-time updates | Real-time sync |
| `src/modules/audit/audit.repository.js` | Add batch insert for audit logs | Performance |

### Environment Variables to Add

```bash
# Security
REQUEST_SIGNING_SECRET=your-signing-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
USER_RATE_LIMIT_MAX=60
```

---

## 🔵 POS Application (`pos/`)

### New Dependencies to Install

```bash
cd pos
npm install @tanstack/react-query @tanstack/react-query-devtools
```

### New Files to Create

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/supabase.js` | Supabase client for real-time | ~15 |
| `src/hooks/useBillsQuery.js` | TanStack Query bills hook | ~140 |
| `src/hooks/useRealtimeSync.js` | Real-time subscription hook | ~100 |
| `src/hooks/useProductsQuery.js` | TanStack Query products hook | ~40 |
| `src/hooks/useCategoriesQuery.js` | TanStack Query categories hook | ~40 |
| `src/api/requestCache.js` | Request deduplication | ~25 |
| `src/utils/requestSigner.js` | HMAC signing utility | ~15 |

### Files to Modify

| File | Changes | Impact |
|------|---------|--------|
| `src/main.jsx` | Add QueryClientProvider | State Management |
| `src/App.jsx` | Add useRealtimeSync hook | Real-time sync |
| `src/services/bills.service.js` | Add dedupeRequest wrapper | Performance |
| `src/services/payment.service.js` | Add request signing | Security |
| `src/pages/POSScreen.jsx` | Migrate to useBillsQuery | State Management |
| `src/beta/pages/BetaPOSScreen.jsx` | Migrate to useBillsQuery | State Management |

### Files to Deprecate (Keep for backward compatibility)

| File | Replacement | Note |
|------|-------------|------|
| `src/hooks/useBills.js` | `useBillsQuery.js` | Can remove after migration |
| `src/hooks/useProducts.js` | `useProductsQuery.js` | Can remove after migration |
| `src/hooks/useCategories.js` | `useCategoriesQuery.js` | Can remove after migration |

### Environment Variables to Add

```bash
# Supabase for Real-time
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Request Signing
VITE_REQUEST_SIGNING_SECRET=your-signing-secret
```

---

## 🟢 ERP Application (`erp/`)

### New Dependencies to Install

```bash
cd erp
npm install @tanstack/react-query @supabase/supabase-js
```

### New Files to Create

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/supabase.js` | Supabase client for real-time | ~15 |
| `src/hooks/useLiveZReport.js` | Live Z-report updates | ~60 |
| `src/hooks/useBillNotifications.js` | Manager notifications | ~50 |
| `src/hooks/useInventorySync.js` | Inventory sync hook | ~50 |

### Files to Modify

| File | Changes | Impact |
|------|---------|--------|
| `src/main.jsx` | Add QueryClientProvider (if not present) | State Management |
| Dashboard components | Add useLiveZReport hook | Real-time reporting |
| Manager views | Add useBillNotifications hook | Notifications |
| Inventory views | Add useInventorySync hook | Real-time inventory |

### Environment Variables to Add

```bash
# Supabase for Real-time
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📊 Supabase Database Changes

### Enable Real-Time for Tables

Execute in Supabase SQL Editor:

```sql
-- Enable real-time for bills table
alter publication supabase_realtime add table bills;

-- Enable real-time for payments table
alter publication supabase_realtime add table payments;

-- Enable real-time for products table (for stock updates)
alter publication supabase_realtime add table products;

-- Enable real-time for rounds table
alter publication supabase_realtime add table rounds;
```

### Verify Real-Time is Enabled

```sql
-- Check which tables are in the publication
select * from pg_publication_tables where pubname = 'supabase_realtime';
```

---

## 🚀 Implementation Order

### Phase 1: API Security & Observability (Week 1)

```
api/
├── src/app.js (MODIFY - add security headers)
├── src/middleware/userRateLimiter.js (NEW)
├── src/middleware/performanceMonitor.js (NEW)
└── src/middleware/audit.middleware.js (NEW)
```

### Phase 2: Real-Time Infrastructure (Week 1-2)

```
pos/
├── src/lib/supabase.js (NEW)
├── src/hooks/useRealtimeSync.js (NEW)
└── src/App.jsx (MODIFY - add real-time hook)

# Enable real-time in Supabase Dashboard
# Run SQL to enable realtime for bills, payments, products
```

### Phase 3: State Management Migration (Week 2-3)

```
pos/
├── src/main.jsx (MODIFY - add QueryClient)
├── src/hooks/useBillsQuery.js (NEW)
├── src/hooks/useProductsQuery.js (NEW)
├── src/hooks/useCategoriesQuery.js (NEW)
├── src/pages/POSScreen.jsx (MODIFY - use new hooks)
└── src/beta/pages/BetaPOSScreen.jsx (MODIFY - use new hooks)
```

### Phase 4: Request Deduplication (Week 3)

```
pos/
├── src/api/requestCache.js (NEW)
└── src/services/bills.service.js (MODIFY - add dedupe)
```

### Phase 5: Payment Security (Week 3-4)

```
api/
└── src/middleware/requestSigner.js (NEW)

pos/
├── src/utils/requestSigner.js (NEW)
└── src/services/payment.service.js (MODIFY - sign requests)
```

### Phase 6: ERP Real-Time Features (Week 4)

```
erp/
├── src/lib/supabase.js (NEW)
├── src/hooks/useLiveZReport.js (NEW)
├── src/hooks/useBillNotifications.js (NEW)
└── src/hooks/useInventorySync.js (NEW)
```

---

## 📁 File Tree Changes

### API Application

```
api/src/
├── app.js                          [MODIFY]
├── middleware/
│   ├── apiRateLimiter.js           [EXISTING]
│   ├── userRateLimiter.js          [NEW]
│   ├── requestSigner.js            [NEW]
│   ├── performanceMonitor.js       [NEW]
│   └── audit.middleware.js         [NEW]
├── modules/
│   ├── bills/
│   │   └── bills.service.js        [MODIFY]
│   └── audit/
│       └── audit.repository.js     [MODIFY]
```

### POS Application

```
pos/src/
├── main.jsx                        [MODIFY]
├── App.jsx                         [MODIFY]
├── lib/
│   └── supabase.js                 [NEW]
├── api/
│   └── requestCache.js             [NEW]
├── hooks/
│   ├── useBills.js                 [DEPRECATE]
│   ├── useBillsQuery.js            [NEW]
│   ├── useProductsQuery.js         [NEW]
│   ├── useCategoriesQuery.js       [NEW]
│   └── useRealtimeSync.js          [NEW]
├── services/
│   ├── bills.service.js            [MODIFY]
│   └── payment.service.js          [MODIFY]
└── utils/
    └── requestSigner.js            [NEW]
```

### ERP Application

```
erp/src/
├── lib/
│   └── supabase.js                 [NEW]
└── hooks/
    ├── useLiveZReport.js           [NEW]
    ├── useBillNotifications.js     [NEW]
    └── useInventorySync.js         [NEW]
```

---

## ⚡ Quick Commands

### Setup

```bash
# Install POS dependencies
cd pos && npm install @tanstack/react-query @tanstack/react-query-devtools

# Install ERP dependencies
cd erp && npm install @tanstack/react-query @supabase/supabase-js
```

### Environment Setup

```bash
# Copy and update environment files
cp pos/.env.example pos/.env
cp api/.env.example api/.env
cp erp/.env.example erp/.env

# Add the new variables (see above sections)
```

### Supabase Setup

```bash
# Using Supabase CLI (if installed)
supabase login
supabase link --project-ref your-project-ref

# Enable real-time tables
supabase db execute "alter publication supabase_realtime add table bills;"
supabase db execute "alter publication supabase_realtime add table payments;"
supabase db execute "alter publication supabase_realtime add table products;"
```

---

## 🎯 Success Metrics

### Performance
- [ ] API response time logged for all endpoints
- [ ] Duplicate requests reduced by 30-50%
- [ ] Bill list refresh time < 200ms (from cache)

### Real-Time
- [ ] Bill updates appear within 2 seconds across devices
- [ ] Payment notifications appear instantly
- [ ] Stock alerts appear in real-time

### Security
- [ ] Payment requests require valid signature
- [ ] User rate limiting blocks >60 req/min per user
- [ ] CSP headers present on all responses

### Observability
- [ ] All financial operations logged to audit table
- [ ] Slow requests (>5s) generate warnings
- [ ] Error rates tracked per endpoint
