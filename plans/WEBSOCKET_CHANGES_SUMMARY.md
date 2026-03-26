# WebSocket Real-Time Implementation - Changes Summary

## Overview
Implemented WebSocket-based real-time updates for the POS system using Socket.io. The architecture maintains security by having POS/ERP connect to the API via WebSockets, and the API connects to Supabase via Realtime.

```
POS ←WebSocket→ API ←Realtime→ Supabase DB
```

---

## 🔴 API Application Changes

### 1. New Dependencies Installed
```bash
npm install socket.io
```

### 2. New Files Created

#### `api/src/websocket/socket.server.js` (NEW)
- Socket.io server initialization
- JWT authentication middleware for WebSocket connections
- Room-based messaging (user-specific, role-based, permission-based)
- Client subscription handling (bills, inventory channels)
- Broadcast function for sending events to clients

#### `api/src/websocket/supabase.subscriber.js` (NEW)
- Subscribes to Supabase real-time changes
- Listens to: bills, payments, products tables
- Broadcasts changes to connected WebSocket clients
- Handles specific events:
  - `bill:created` - New bill created
  - `bill:voided` - Bill voided
  - `payment:awaiting_confirmation` - Payment needs approval
  - `inventory:stock_changed` - Stock level changed
  - `inventory:low_stock` - Low stock alert

### 3. Modified Files

#### `api/src/server.js` (MODIFIED)
**Changes:**
- Replaced `app.listen()` with `createServer(app)` for HTTP server
- Added WebSocket server initialization
- Added Supabase subscriber initialization
- Added graceful shutdown handling (SIGTERM, SIGINT)

**Key additions:**
```javascript
const { createServer } = require("http");
const { initializeSocketServer } = require("./websocket/socket.server");
const { initializeSupabaseSubscriber } = require("./websocket/supabase.subscriber");

const httpServer = createServer(app);
initializeSocketServer(httpServer);
initializeSupabaseSubscriber();

httpServer.listen(PORT, () => {
  logger.info(`Server running on PORT ${PORT}`);
  logger.info(`WebSocket server ready`);
});
```

#### `api/src/modules/bills/bills.service.js` (MODIFIED)
**Changes:**
- Added import for broadcast function
- Added `broadcast()` calls in:
  - `createBill()` - broadcasts `bill:created` event
  - `voidBill()` - broadcasts `bill:voided` event
  - `addRound()` - broadcasts `round:created` event

---

## 🔵 POS Application Changes

### 1. New Dependencies Installed
```bash
npm install socket.io-client
```

### 2. New Files Created

#### `pos/src/hooks/useSocket.js` (NEW)
- Manages Socket.io client connection
- Authenticates with JWT token
- Handles connection events (connect, disconnect, error)
- Provides `subscribe()`, `unsubscribe()`, `emit()` methods
- Automatic reconnection with exponential backoff

#### `pos/src/hooks/useRealtimeSync.js` (NEW)
- High-level hook for real-time synchronization
- Handles all WebSocket events:
  - `bill:created` - Shows toast notification, reloads bills
  - `bill:voided` - Shows toast, reloads bills
  - `round:created` - Reloads bills
  - `payment:awaiting_confirmation` - Shows toast notification
  - `payment:created` - Reloads bills
  - `inventory:stock_changed` - Triggers inventory refresh
  - `inventory:low_stock` - Shows low stock warning toast
- Subscribes to server channels on connection
- Cleans up subscriptions on unmount

### 3. Modified Files

#### `pos/src/App.jsx` (MODIFIED)
**Changes:**
- Added import for `useRealtimeSync` hook
- Added import for `useBills` hook
- Created callback functions for bills and inventory changes
- Integrated `useRealtimeSync` hook with callbacks
- Added logging for connection status

**Key additions:**
```javascript
import { useRealtimeSync } from "./hooks/useRealtimeSync";
import { useBills } from "./hooks/useBills";

const AppContent = () => {
  const { reload: reloadBills } = useBills();
  
  const handleBillsChange = useCallback(() => {
    reloadBills();
  }, [reloadBills]);

  const { isConnected } = useRealtimeSync(user?.id, {
    onBillsChange: handleBillsChange,
    onInventoryChange: handleInventoryChange,
  });
  // ...
};
```

---

## 🗄️ Database Changes

### `supabase_realtime_setup.sql` (NEW FILE)
SQL commands to enable real-time for required tables:

```sql
-- Enable real-time for bills table
alter publication supabase_realtime add table bills;

-- Enable real-time for payments table
alter publication supabase_realtime add table payments;

-- Enable real-time for products table
alter publication supabase_realtime add table products;

-- Enable real-time for rounds table
alter publication supabase_realtime add table rounds;
```

**Action Required:** Run this SQL in your Supabase SQL Editor.

---

## 📊 File Change Summary

### API (5 files)
| File | Action | Lines |
|------|--------|-------|
| `package.json` | Modified (added socket.io) | - |
| `src/websocket/socket.server.js` | Created | ~120 |
| `src/websocket/supabase.subscriber.js` | Created | ~150 |
| `src/server.js` | Modified | ~40 changed |
| `src/modules/bills/bills.service.js` | Modified | ~30 changed |

### POS (4 files)
| File | Action | Lines |
|------|--------|-------|
| `package.json` | Modified (added socket.io-client) | - |
| `src/hooks/useSocket.js` | Created | ~80 |
| `src/hooks/useRealtimeSync.js` | Created | ~140 |
| `src/App.jsx` | Modified | ~25 changed |

### Database (1 file)
| File | Action |
|------|--------|
| `supabase_realtime_setup.sql` | Created |

---

## 🚀 How It Works

### Bill Creation Flow
1. User creates bill on POS-1
2. `bills.service.js` creates bill in database
3. `broadcast("bill:created")` sends to all connected clients
4. Supabase Realtime also triggers (as backup)
5. POS-2 receives `bill:created` event via WebSocket
6. `useRealtimeSync` shows toast: "New bill: John"
7. `useRealtimeSync` calls `reloadBills()` to refresh list

### Payment Confirmation Flow
1. Bartender processes payment on POS
2. Bill status changes to "awaiting_confirmation"
3. Supabase Realtime detects change
4. `supabase.subscriber.js` broadcasts `payment:awaiting_confirmation`
5. Manager's ERP receives event (has `approve_payments` permission)
6. Toast notification: "Payment awaiting confirmation: Table 5"

### Stock Alert Flow
1. Round is added, inventory decreases
2. Product stock goes below reorder_level
3. Supabase Realtime detects product update
4. `supabase.subscriber.js` broadcasts `inventory:low_stock`
5. All connected POS clients receive alert
6. Toast: "Low stock: Beer (5 remaining)"

---

## ✅ Testing Checklist

### API Tests
- [ ] Server starts without errors
- [ ] Console shows "WebSocket server ready"
- [ ] Console shows "Supabase Subscriber] Initialized"
- [ ] Supabase subscription statuses show "SUBSCRIBED"

### POS Tests
- [ ] POS connects to WebSocket (console: "[Socket] Connected")
- [ ] POS subscribes to bills (console: "User X subscribed to bills")
- [ ] Create bill on POS-1 → POS-2 shows notification
- [ ] Void bill on POS-1 → POS-2 updates automatically
- [ ] Add round on POS-1 → Stock updates on all POS
- [ ] Low stock triggers warning toast

### Cross-Device Tests
- [ ] Two browser tabs open to POS
- [ ] Create bill in tab 1 → appears in tab 2 within 2 seconds
- [ ] Manager receives payment confirmation notification

---

## 🔧 Troubleshooting

### WebSocket Not Connecting
1. Check browser console for errors
2. Verify `VITE_SERVER_URL` is set correctly
3. Ensure API server is running and accessible
4. Check CORS settings in `socket.server.js`

### Real-Time Updates Not Working
1. Run SQL to enable real-time tables (see Database Changes)
2. Check API console for "Supabase subscription status: SUBSCRIBED"
3. Verify tables are in publication: `select * from pg_publication_tables`

### Authentication Errors
1. Ensure user is logged in (token exists)
2. Check token is being sent: `socket.handshake.auth.token`
3. Verify JWT verification is working

---

## 🔒 Security Considerations

1. **JWT Authentication**: WebSocket connections require valid JWT token
2. **Room-based Access**: Users only receive events for their permissions
3. **No DB Credentials**: POS/ERP never connect directly to database
4. **CORS Restricted**: Only allowed origins can connect
5. **Reconnection Limits**: Prevents connection flooding

---

## 📈 Performance Benefits

- **Reduced Polling**: No need for frequent HTTP polling
- **Instant Updates**: Changes appear within milliseconds
- **Bandwidth Efficient**: Only changed data is sent
- **Scalable**: Room-based architecture supports many clients
