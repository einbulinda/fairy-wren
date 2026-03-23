# Priority Changes - Start Here

## Critical Items to Implement First

---

## 1️⃣ Supabase Real-Time Setup (15 minutes)

### Database Changes

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable real-time for bills table
alter publication supabase_realtime add table bills;

-- Enable real-time for payments table
alter publication supabase_realtime add table payments;

-- Enable real-time for products table (for stock updates)
alter publication supabase_realtime add table products;

-- Verify
select * from pg_publication_tables where pubname = 'supabase_realtime';
```

---

## 2️⃣ POS Real-Time Sync (30 minutes)

### Step 1: Create Supabase Client
**File:** `pos/src/lib/supabase.js` (NEW)

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables are missing");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

### Step 2: Create Real-Time Hook
**File:** `pos/src/hooks/useRealtimeSync.js` (NEW)

```javascript
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export const useRealtimeSync = (userId, onBillsChange) => {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("pos-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bills" },
        (payload) => {
          // Call the callback to refresh bills
          onBillsChange?.();

          // Show notifications
          if (payload.eventType === "INSERT" && payload.new.created_by !== userId) {
            toast.info(`New bill: ${payload.new.customer_name}`);
          }
          if (payload.eventType === "UPDATE" && payload.new.status === "awaiting_confirmation") {
            toast.info("Payment awaiting confirmation", { icon: "💰" });
          }
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [userId, onBillsChange]);
};
```

### Step 3: Add Environment Variables
**File:** `pos/.env`

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 4: Integrate into App
**File:** `pos/src/App.jsx` (MODIFY)

```jsx
import { useRealtimeSync } from "./hooks/useRealtimeSync";
import { useAuth } from "./hooks/useAuth";

const AppContent = () => {
  const { user } = useAuth();
  const { reloadBills } = useBills(); // Get from your existing hook

  // Enable real-time sync
  useRealtimeSync(user?.id, reloadBills);

  // ... rest of component
};
```

---

## 3️⃣ Request Deduplication (20 minutes)

### Step 1: Create Request Cache
**File:** `pos/src/api/requestCache.js` (NEW)

```javascript
const pendingRequests = new Map();

export const dedupeRequest = async (key, requestFn) => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
};
```

### Step 2: Apply to Bills Service
**File:** `pos/src/services/bills.service.js` (MODIFY)

```javascript
import { dedupeRequest } from "@/api/requestCache";

// In BillsService object:
async list(params = {}, signal) {
  const cacheKey = `bills:list:${JSON.stringify(params)}`;
  
  return dedupeRequest(cacheKey, async () => {
    const { data } = await api.get("/bills", { params, signal });
    return data;
  });
},

async getById(billId, signal) {
  const cacheKey = `bills:get:${billId}`;
  
  return dedupeRequest(cacheKey, async () => {
    const { data } = await api.get(`/bills/${billId}`, { signal });
    return data;
  });
}
```

---

## 4️⃣ API Security Headers (15 minutes)

### File: `api/src/app.js` (MODIFY)

Replace the helmet() call:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

## 5️⃣ User Rate Limiting (20 minutes)

### File: `api/src/middleware/userRateLimiter.js` (NEW)

```javascript
const userRequestStore = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

module.exports = (req, res, next) => {
  if (!req.user?.id) return next();

  const key = `${req.user.id}:${Math.floor(Date.now() / WINDOW_MS)}`;
  const current = userRequestStore.get(key) || 0;

  if (current >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: { code: "RATE_LIMIT", message: "Too many requests" }
    });
  }

  userRequestStore.set(key, current + 1);
  next();
};
```

### File: `api/src/app.js` (MODIFY)

Add after apiRateLimiter:

```javascript
const userRateLimiter = require("./middleware/userRateLimiter");
app.use(userRateLimiter);
```

---

## 📋 Implementation Checklist

### Today (2 hours)
- [ ] Run Supabase SQL to enable real-time
- [ ] Create `pos/src/lib/supabase.js`
- [ ] Create `pos/src/hooks/useRealtimeSync.js`
- [ ] Add Supabase env vars to POS
- [ ] Modify `pos/src/App.jsx` to use real-time hook
- [ ] Test: Create bill on one device, see it appear on another

### This Week (4 hours)
- [ ] Create `pos/src/api/requestCache.js`
- [ ] Modify `pos/src/services/bills.service.js` for deduplication
- [ ] Create `api/src/middleware/userRateLimiter.js`
- [ ] Modify `api/src/app.js` for security headers and rate limiting
- [ ] Test rate limiting with 60+ requests

### Next Week (8 hours)
- [ ] Install TanStack Query
- [ ] Create new query hooks
- [ ] Migrate POSScreen to new hooks
- [ ] Test optimistic updates and rollback

---

## 🧪 Testing Commands

### Test Real-Time
```bash
# Open two browser tabs to POS
# Create a bill in tab 1
# Verify it appears in tab 2 within 2 seconds
```

### Test Rate Limiting
```bash
# Run this in browser console to test rate limiting
for (let i = 0; i < 70; i++) {
  fetch('/api/bills').then(r => console.log(i, r.status));
}
```

### Test Request Deduplication
```bash
# Open Network tab in DevTools
# Click "Refresh" button rapidly
# Should see only 1 request for bills, not multiple
```

---

## 🚨 Common Issues

### Real-Time Not Working?
1. Check Supabase URL and key in `.env`
2. Verify tables are in publication: `select * from pg_publication_tables`
3. Check browser console for connection errors

### Rate Limiting Too Aggressive?
1. Adjust `MAX_REQUESTS` in `userRateLimiter.js`
2. Consider different limits for different endpoints

### CORS Errors?
1. Ensure your domain is in the CORS origin list in `api/src/app.js`
2. Check that credentials are being sent with requests
