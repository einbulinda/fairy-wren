# Corrected Real-Time Implementation

## Architecture Correction

**Current Flow:**
```
POS/ERP → API → Supabase DB
```

**Corrected Real-Time Flow:**
```
POS ←WebSocket→ API ←Realtime→ Supabase DB
ERP ←WebSocket→ API ←Realtime→ Supabase DB
```

The API acts as the WebSocket server - POS/ERP connect to the API via WebSockets, not directly to Supabase.

---

## 🔴 API Application Changes (WebSocket Server)

### 1. Install Dependencies

```bash
cd api
npm install socket.io
```

---

### 2. Create WebSocket Server

**File:** `api/src/websocket/socket.server.js` (NEW)

```javascript
const { Server } = require("socket.io");
const { verifyToken } = require("../utils/jwt");

let io = null;

/**
 * Initialize Socket.io server
 * @param {http.Server} httpServer - HTTP server instance
 */
function initializeSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "https://pos.fairywren.co.ke",
        "https://erp.fairywren.co.ke",
        "http://localhost:5173",
        "http://localhost:5174",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Use polling for better compatibility (can upgrade to WebSocket)
    transports: ["polling", "websocket"],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = verifyToken(token);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userPermissions = decoded.permissions || [];

      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[WebSocket] User ${socket.userId} connected`);

    // Join user-specific room for targeted updates
    socket.join(`user:${socket.userId}`);

    // Join role-based rooms
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`);
    }

    // Join permission-based rooms
    socket.userPermissions.forEach((perm) => {
      socket.join(`perm:${perm}`);
    });

    // Handle client subscription requests
    socket.on("subscribe:bills", () => {
      socket.join("bills");
      console.log(`[WebSocket] User ${socket.userId} subscribed to bills`);
    });

    socket.on("unsubscribe:bills", () => {
      socket.leave("bills");
    });

    socket.on("subscribe:inventory", () => {
      socket.join("inventory");
    });

    socket.on("unsubscribe:inventory", () => {
      socket.leave("inventory");
    });

    socket.on("disconnect", () => {
      console.log(`[WebSocket] User ${socket.userId} disconnected`);
    });
  });

  return io;
}

/**
 * Get the io instance (must call initializeSocketServer first)
 */
function getIO() {
  if (!io) {
    throw new Error("Socket server not initialized");
  }
  return io;
}

/**
 * Broadcast a message to all connected clients or specific rooms
 */
function broadcast(event, data, options = {}) {
  if (!io) return;

  const { room, permissions } = options;

  if (room) {
    io.to(room).emit(event, data);
  } else if (permissions) {
    // Broadcast to users with specific permissions
    permissions.forEach((perm) => {
      io.to(`perm:${perm}`).emit(event, data);
    });
  } else {
    io.emit(event, data);
  }
}

module.exports = {
  initializeSocketServer,
  getIO,
  broadcast,
};
```

---

### 3. Create Supabase Realtime Subscriber

**File:** `api/src/websocket/supabase.subscriber.js` (NEW)

```javascript
const getSupabase = require("../config/supabase");
const { broadcast } = require("./socket.server");

let subscriptions = [];

/**
 * Subscribe to Supabase real-time changes and broadcast to WebSocket clients
 */
function initializeSupabaseSubscriber() {
  const supabase = getSupabase();

  // Subscribe to bills table changes
  const billsSubscription = supabase
    .channel("api:bills")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bills" },
      (payload) => {
        console.log("[Supabase Realtime] Bill change:", payload.eventType);

        // Broadcast to all connected POS clients
        broadcast("bill:changed", {
          event: payload.eventType,
          bill: payload.new,
          old: payload.old,
          timestamp: new Date().toISOString(),
        });

        // Specific notifications based on event type
        if (payload.eventType === "UPDATE") {
          // Notify managers of payment confirmations
          if (
            payload.new.status === "awaiting_confirmation" &&
            payload.old.status !== "awaiting_confirmation"
          ) {
            broadcast(
              "payment:awaiting_confirmation",
              {
                billId: payload.new.id,
                customerName: payload.new.customer_name,
                timestamp: new Date().toISOString(),
              },
              { permissions: ["approve_payments"] }
            );
          }
        }
      }
    )
    .subscribe();

  subscriptions.push(billsSubscription);

  // Subscribe to payments table changes
  const paymentsSubscription = supabase
    .channel("api:payments")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "payments" },
      (payload) => {
        broadcast("payment:created", {
          payment: payload.new,
          timestamp: new Date().toISOString(),
        });
      }
    )
    .subscribe();

  subscriptions.push(paymentsSubscription);

  // Subscribe to products table changes (stock updates)
  const productsSubscription = supabase
    .channel("api:products")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "products" },
      (payload) => {
        // Only broadcast if stock changed
        if (payload.new.current_stock !== payload.old.current_stock) {
          broadcast("inventory:stock_changed", {
            productId: payload.new.id,
            productName: payload.new.name,
            oldStock: payload.old.current_stock,
            newStock: payload.new.current_stock,
            reorderLevel: payload.new.reorder_level,
            timestamp: new Date().toISOString(),
          });

          // Alert if stock is now low
          if (
            payload.new.current_stock <= payload.new.reorder_level &&
            payload.old.current_stock > payload.new.reorder_level
          ) {
            broadcast("inventory:low_stock", {
              productId: payload.new.id,
              productName: payload.new.name,
              currentStock: payload.new.current_stock,
              reorderLevel: payload.new.reorder_level,
            });
          }
        }
      }
    )
    .subscribe();

  subscriptions.push(productsSubscription);

  console.log("[Supabase Subscriber] Initialized");
}

/**
 * Clean up subscriptions on shutdown
 */
function cleanupSubscriptions() {
  subscriptions.forEach((sub) => sub.unsubscribe());
  subscriptions = [];
}

module.exports = {
  initializeSupabaseSubscriber,
  cleanupSubscriptions,
};
```

---

### 4. Update Server.js to Initialize WebSocket

**File:** `api/src/server.js` (MODIFY)

```javascript
const app = require("./app");
const { createServer } = require("http");
const { initializeSocketServer } = require("./websocket/socket.server");
const { initializeSupabaseSubscriber } = require("./websocket/supabase.subscriber");

const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket server
initializeSocketServer(httpServer);

// Initialize Supabase real-time subscriber
initializeSupabaseSubscriber();

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
```

---

### 5. Update Bills Service to Broadcast Changes

**File:** `api/src/modules/bills/bills.service.js` (MODIFY - Add broadcasts)

```javascript
const repo = require("./bills.repository");
const auditRepo = require("../audit/audit.repository");
const inventoryService = require("../inventory/services/inventory.sale.service");
const { broadcast } = require("../../websocket/socket.server"); // ADD THIS

// ... existing DTO imports ...

exports.createBill = async (payload, context) => {
  const dto = CreateBillDTO(payload);
  const { data, error } = await repo.createBill({
    customer_name: dto.customer_name,
    status: "open",
    created_by: context.userId,
  });

  if (error) throw new Error("FAILED_TO_CREATE_BILL");

  // Broadcast to all connected clients
  broadcast("bill:created", {
    bill: data,
    createdBy: context.userId,
    timestamp: new Date().toISOString(),
  });

  await auditRepo.log({
    entity: "bills",
    entity_id: data?.id,
    action: "BILL_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });

  return data;
};

exports.voidBill = async (id, context) => {
  const { error: reversalError } = await repo.reverseBillSale(id);
  if (reversalError) throw new Error("FAILED_TO_REVERSE_BILL_SALE");

  const { error } = await repo.updateBillStatus(id, "void", context.userId);

  if (error) throw new Error("FAILED_TO_VOID_BILL");

  // Broadcast void action
  broadcast("bill:voided", {
    billId: id,
    voidedBy: context.userId,
    timestamp: new Date().toISOString(),
  });

  await auditRepo.log({
    entity: "bills",
    entity_id: id,
    action: "BILL_VOIDED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });

  return { id, status: "void" };
};

exports.addRound = async (billId, payload, context) => {
  // ... existing validation code ...

  const { data: round, error: roundError } = await repo.createRound({
    bill_id: billId,
    round_number: roundNumber,
    created_by: context.userId,
  });

  if (roundError) {
    throw new Error("FAILED_TO_CREATE_ROUND");
  }

  // ... existing item insertion ...

  const { error: saleError } = await repo.postRoundSale(round.id);
  if (saleError) {
    throw new Error("FAILED_TO_POST_ROUND_SALE");
  }

  // Broadcast round creation
  broadcast("round:created", {
    billId,
    round,
    items,
    createdBy: context.userId,
    timestamp: new Date().toISOString(),
  });

  await auditRepo.log({
    entity: "rounds",
    entity_id: round.id,
    action: "ROUND_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      bill_id: billId,
      round_number: roundNumber,
      item_count: items.length,
    },
  });

  return { round, items };
};
```

---

## 🔵 POS Application Changes (WebSocket Client)

### 1. Install Dependencies

```bash
cd pos
npm install socket.io-client
```

---

### 2. Create Socket Hook

**File:** `pos/src/hooks/useSocket.js` (NEW)

```javascript
import { useEffect, useRef, useCallback, useState } from "react";
import { io } from "socket.io-client";
import { TokenService } from "@/api/token.service";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL; // Same as API URL

export const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    const token = TokenService.getToken();
    
    if (!token) {
      setConnectionError("No authentication token");
      return;
    }

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"], // Start with polling, upgrade to WebSocket
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("[Socket] Connected");
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, []);

  // Subscribe to events
  const subscribe = useCallback((event, callback) => {
    if (!socketRef.current) return;
    socketRef.current.on(event, callback);
  }, []);

  // Unsubscribe from events
  const unsubscribe = useCallback((event, callback) => {
    if (!socketRef.current) return;
    socketRef.current.off(event, callback);
  }, []);

  // Emit events to server
  const emit = useCallback((event, data) => {
    if (!socketRef.current) return;
    socketRef.current.emit(event, data);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    subscribe,
    unsubscribe,
    emit,
  };
};
```

---

### 3. Create Real-Time Sync Hook

**File:** `pos/src/hooks/useRealtimeSync.js` (NEW - Corrected)

```javascript
import { useEffect, useCallback } from "react";
import { useSocket } from "./useSocket";
import toast from "react-hot-toast";

export const useRealtimeSync = (userId, { onBillsChange, onInventoryChange }) => {
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();

  // Handle bill events
  const handleBillCreated = useCallback(
    (data) => {
      console.log("[Realtime] Bill created:", data);
      
      // Refresh bills list
      onBillsChange?.();

      // Show notification if created by another user
      if (data.createdBy !== userId) {
        toast.info(`New bill: ${data.bill.customer_name}`, {
          duration: 3000,
        });
      }
    },
    [userId, onBillsChange]
  );

  const handleBillVoided = useCallback(
    (data) => {
      console.log("[Realtime] Bill voided:", data);
      onBillsChange?.();
      toast.info("A bill was voided", { duration: 3000 });
    },
    [onBillsChange]
  );

  const handlePaymentAwaiting = useCallback(
    (data) => {
      console.log("[Realtime] Payment awaiting confirmation:", data);
      onBillsChange?.();
      toast.info(`Payment awaiting confirmation: ${data.customerName}`, {
        icon: "💰",
        duration: 5000,
      });
    },
    [onBillsChange]
  );

  // Handle inventory events
  const handleStockChanged = useCallback(
    (data) => {
      console.log("[Realtime] Stock changed:", data);
      onInventoryChange?.();
    },
    [onInventoryChange]
  );

  const handleLowStock = useCallback((data) => {
    console.log("[Realtime] Low stock:", data);
    toast.warning(
      `Low stock: ${data.productName} (${data.currentStock} remaining)`,
      { duration: 5000 }
    );
  }, []);

  // Set up subscriptions when connected
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to server channels
    emit("subscribe:bills");
    emit("subscribe:inventory");

    // Register event listeners
    subscribe("bill:created", handleBillCreated);
    subscribe("bill:voided", handleBillVoided);
    subscribe("payment:awaiting_confirmation", handlePaymentAwaiting);
    subscribe("inventory:stock_changed", handleStockChanged);
    subscribe("inventory:low_stock", handleLowStock);

    // Cleanup
    return () => {
      unsubscribe("bill:created", handleBillCreated);
      unsubscribe("bill:voided", handleBillVoided);
      unsubscribe("payment:awaiting_confirmation", handlePaymentAwaiting);
      unsubscribe("inventory:stock_changed", handleStockChanged);
      unsubscribe("inventory:low_stock", handleLowStock);
      
      emit("unsubscribe:bills");
      emit("unsubscribe:inventory");
    };
  }, [
    isConnected,
    subscribe,
    unsubscribe,
    emit,
    handleBillCreated,
    handleBillVoided,
    handlePaymentAwaiting,
    handleStockChanged,
    handleLowStock,
  ]);

  return { isConnected };
};
```

---

### 4. Integrate into App

**File:** `pos/src/App.jsx` (MODIFY)

```jsx
import "./App.css";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import { useRealtimeSync } from "./hooks/useRealtimeSync"; // NEW
import { useBills } from "./hooks/useBills"; // Existing hook
import LoginScreen from "./pages/LoginScreen";
import MainLayout from "./components/layout/MainLayout";
import BetaMainLayout from "./beta/layout/BetaMainLayout";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { ThemeProvider } from "./context/ThemeProvider";

const AppContent = () => {
  const { user } = useAuth();
  const { reload: reloadBills } = useBills(); // Get reload function from existing hook

  // Enable real-time sync when authenticated
  const { isConnected } = useRealtimeSync(user?.id, {
    onBillsChange: reloadBills,
    onInventoryChange: () => {
      // Refresh products when inventory changes
      // This will be implemented in your existing products hook
    },
  });

  // Optional: Show connection status
  useEffect(() => {
    if (user && !isConnected) {
      console.warn("[App] Real-time connection not established");
    }
  }, [user, isConnected]);

  if (!user) {
    return <LoginScreen />;
  }

  return <MainLayout />; // or BetaMainLayout based on preference
};

// ... rest of App component (Toaster, ThemeProvider, etc.)
```

---

## 🟢 ERP Application Changes (WebSocket Client)

Same pattern as POS - use the `useSocket` and `useRealtimeSync` hooks.

**File:** `erp/src/hooks/useSocket.js` (SAME as POS)

**File:** `erp/src/hooks/useManagerNotifications.js` (NEW)

```javascript
import { useEffect, useCallback } from "react";
import { useSocket } from "./useSocket";
import toast from "react-hot-toast";

export const useManagerNotifications = (userRole) => {
  const { isConnected, subscribe, unsubscribe } = useSocket();

  const handlePaymentAwaiting = useCallback((data) => {
    toast.info(
      `Bill #${data.billId.slice(-6)} for ${data.customerName} awaiting confirmation`,
      {
        duration: 10000,
        icon: "💰",
        action: {
          label: "View",
          onClick: () => {
            window.location.href = `/pos?bill=${data.billId}`;
          },
        },
      }
    );
  }, []);

  useEffect(() => {
    if (!isConnected || !["manager", "admin"].includes(userRole)) return;

    subscribe("payment:awaiting_confirmation", handlePaymentAwaiting);

    return () => {
      unsubscribe("payment:awaiting_confirmation", handlePaymentAwaiting);
    };
  }, [isConnected, userRole, subscribe, unsubscribe, handlePaymentAwaiting]);
};
```

---

## 📊 Environment Variables (Corrected)

### API (`.env`)
```bash
# No new variables needed - uses existing Supabase credentials
```

### POS (`.env`)
```bash
# Same as before - connects to API, not Supabase directly
VITE_SERVER_URL=https://api.fairywren.co.ke
# NO Supabase keys needed here
```

### ERP (`.env`)
```bash
VITE_API_URL=https://api.fairywren.co.ke
# NO Supabase keys needed here
```

---

## 🎯 Summary of Corrected Architecture

| Component | Old (Wrong) | New (Correct) |
|-----------|-------------|---------------|
| **POS** | Direct Supabase connection | WebSocket to API |
| **ERP** | Direct Supabase connection | WebSocket to API |
| **API** | HTTP only | HTTP + WebSocket Server + Supabase Realtime |
| **Security** | Exposed Supabase keys | Keys stay in API only |

---

## ✅ Verification Steps

1. **Start API server** - Should log "WebSocket server ready"
2. **Open POS** - Should see "[Socket] Connected" in console
3. **Create bill on POS** - Should see "[Supabase Realtime] Bill change" in API console
4. **Open second POS tab** - Bill should appear automatically
5. **Check ERP** - Manager should receive notifications
