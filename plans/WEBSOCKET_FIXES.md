# WebSocket Fixes Applied

## Issues Fixed

### 1. Timing Issue in bills.service.js
**Problem:** The `broadcast` function was imported at module load time, but the socket server (`io`) wasn't initialized until later.

**Fix:** Changed to lazy loading - the broadcast function is now required at call time:
```javascript
let broadcast;
function getBroadcast() {
  if (!broadcast) {
    broadcast = require("../../websocket/socket.server").broadcast;
  }
  return broadcast;
}
```

### 2. Added Debug Logging
Added extensive logging to both API and POS to help diagnose connection issues:
- API logs when broadcasting events
- POS logs socket connection status
- POS logs all received events with `socket.onAny()`

## What to Check

### 1. API Server Console
You should see these logs in order:
```
Bootstrapping FairyWren API...
[Supabase Subscriber] Initialized successfully
[Supabase Subscriber] Bills subscription status: SUBSCRIBED
[Supabase Subscriber] Payments subscription status: SUBSCRIBED
[Supabase Subscriber] Products subscription status: SUBSCRIBED
Server running on PORT 8000
WebSocket server ready
```

When a bill is created:
```
[WebSocket] Broadcasting 'bill:created' to all clients
```

### 2. POS Browser Console
You should see:
```
[Socket] Connecting to: https://api.fairywren.co.ke
[Socket] Connected, socket id: xxxxxxxxxxx
[Realtime] Setting up subscriptions for user: <user-id>
[Socket] Subscribing to: bill:changed
[Socket] Subscribing to: bill:created
...
[Socket] Emitting: subscribe:bills
[Socket] Emitting: subscribe:inventory
```

When a bill is created on another device:
```
[Socket] Received event: bill:created [{...}]
[Realtime] Bill created event received: {...}
```

## Common Issues & Solutions

### Issue: "Cannot broadcast - server not initialized"
**Cause:** The bills.service.js tried to broadcast before the socket server was ready.

**Fix Applied:** Lazy loading of broadcast function ensures it's only called when needed.

### Issue: "No token, skipping connection" in POS
**Cause:** User not logged in yet.

**Expected:** This is normal before login. After login, the socket should connect.

### Issue: Socket connects but no events received
**Check:**
1. Are both POS devices showing "[Socket] Connected"?
2. Is the API showing subscription statuses as "SUBSCRIBED"?
3. Is the API showing broadcast logs when bills are created?

## Testing Steps

1. **Restart API Server**
   ```bash
   cd api
   npm run dev  # or your start command
   ```

2. **Open POS in Two Browser Tabs**
   - Open http://localhost:5173 (or your POS URL) in two tabs
   - Login on both

3. **Check Console Logs**
   - Both should show "[Socket] Connected"
   - Both should show "Setting up subscriptions"

4. **Create a Bill**
   - Create a bill in Tab 1
   - Check Tab 2 console for "bill:created" event
   - Tab 2 should show a toast notification

## If Still Not Working

Check these:

1. **Are you using the correct API URL?**
   - POS `.env` should have `VITE_SERVER_URL=http://localhost:8000` (or your API URL)

2. **Is CORS configured correctly?**
   - `api/src/app.js` should have your POS origin in the CORS list

3. **Is the Supabase Realtime enabled?**
   ```sql
   -- Run this in Supabase SQL Editor
   select * from pg_publication_tables where pubname = 'supabase_realtime';
   ```
   Should show: bills, payments, products, rounds

4. **Check Network Tab**
   - Look for WebSocket connections (ws:// or wss://)
   - Look for polling requests to /socket.io/

## Quick Debug Commands

In browser console (POS):
```javascript
// Check socket status
localStorage.getItem('token')  // Should show JWT token

// Force reconnect (if needed)
location.reload()
```

In API terminal:
```bash
# Check if server is listening on correct port
lsof -i :8000  # Mac/Linux
netstat -ano | findstr :8000  # Windows
```
