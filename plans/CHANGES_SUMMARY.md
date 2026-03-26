# Changes Summary by Application (Corrected)

## Architecture

```
┌─────┐      WebSocket       ┌─────┐      Realtime       ┌───────────┐
│ POS │◄────────────────────►│ API │◄───────────────────►│ Supabase  │
└─────┘                      └─────┘                      └───────────┘
   ▲                           ▲                               │
   │                           │                               │
   │                           │                               │
   │      HTTP Requests        │                               │
┌─────┐                      ┌─────┐                           │
│ ERP │◄────────────────────►│     │                           │
└─────┘                      └─────┘                           │
                                                            │
                                                        Database
```

**Key Point:** POS and ERP connect to the API via WebSockets. The API connects to Supabase via Realtime.

---

## 🔴 API Application Changes

### New Dependencies
```bash
cd api
npm install socket.io
```

### New Files (4)

| File | Purpose | Lines |
|------|---------|-------|
| `src/websocket/socket.server.js` | Socket.io server setup | ~120 |
| `src/websocket/supabase.subscriber.js` | Subscribe to DB changes | ~100 |
| `src/middleware/userRateLimiter.js` | Per-user rate limiting | ~50 |
| `src/middleware/performanceMonitor.js` | API performance tracking | ~35 |

### Modified Files (3)

| File | Changes |
|------|---------|
| `src/server.js` | Initialize WebSocket server and Supabase subscriber |
| `src/app.js` | Add security headers, user rate limiter, performance monitor |
| `src/modules/bills/bills.service.js` | Broadcast events via WebSocket |

---

## 🔵 POS Application Changes

### New Dependencies
```bash
cd pos
npm install socket.io-client
```

### New Files (4)

| File | Purpose | Lines |
|------|---------|-------|
| `src/hooks/useSocket.js` | Socket.io client connection | ~80 |
| `src/hooks/useRealtimeSync.js` | Handle real-time events | ~100 |
| `src/api/requestCache.js` | Request deduplication | ~25 |
| `src/utils/requestSigner.js` | Request signing (optional) | ~15 |

### Modified Files (3)

| File | Changes |
|------|---------|
| `src/App.jsx` | Add useRealtimeSync hook |
| `src/services/bills.service.js` | Add request deduplication |
| `src/services/payment.service.js` | Add request signing (optional) |

### NO Environment Changes
- Uses existing `VITE_SERVER_URL` for WebSocket connection
- No Supabase keys needed

---

## 🟢 ERP Application Changes

### New Dependencies
```bash
cd erp
npm install socket.io-client
```

### New Files (3)

| File | Purpose |
|------|---------|
| `src/hooks/useSocket.js` | Socket.io client (same as POS) |
| `src/hooks/useRealtimeSync.js` | Handle real-time events |
| `src/hooks/useManagerNotifications.js` | Manager-specific notifications |

### Modified Files
- Dashboard components to use real-time hooks

### NO Environment Changes
- Uses existing `VITE_API_URL`
- No Supabase keys needed

---

## 📊 Database Changes (Supabase)

Run in Supabase SQL Editor:

```sql
-- Enable real-time for bills table
alter publication supabase_realtime add table bills;

-- Enable real-time for payments table
alter publication supabase_realtime add table payments;

-- Enable real-time for products table
alter publication supabase_realtime add table products;
```

---

## 🚀 Implementation Order

### Phase 1: API WebSocket Server (2 hours)
1. Install socket.io
2. Create `websocket/socket.server.js`
3. Create `websocket/supabase.subscriber.js`
4. Modify `server.js` to initialize WebSocket
5. Enable real-time tables in Supabase

### Phase 2: POS Real-Time (1 hour)
1. Install socket.io-client
2. Create `hooks/useSocket.js`
3. Create `hooks/useRealtimeSync.js`
4. Modify `App.jsx` to use real-time hook
5. Test cross-device bill updates

### Phase 3: Request Deduplication (30 min)
1. Create `api/requestCache.js`
2. Modify `services/bills.service.js`

### Phase 4: Security & Monitoring (2 hours)
1. Add security headers to API
2. Add user rate limiting
3. Add performance monitoring
4. Add audit logging (optional)

### Phase 5: ERP Integration (1 hour)
1. Copy socket hooks from POS
2. Create manager notifications hook
3. Integrate into dashboard

---

## ✅ Verification Checklist

### API
- [ ] Server starts with "WebSocket server ready" log
- [ ] Supabase subscriber initialized
- [ ] WebSocket connections accepted with valid JWT
- [ ] Database changes broadcast to clients

### POS
- [ ] Socket connects successfully
- [ ] "[Socket] Connected" in console
- [ ] Bills auto-refresh when created on other devices
- [ ] Low stock alerts appear in real-time

### ERP
- [ ] Manager receives payment confirmation notifications
- [ ] Live Z-report updates during shift
