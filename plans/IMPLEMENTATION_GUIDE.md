# POS System Enhancement - Implementation Guide

This guide organizes all recommendations by application (ERP, API, POS) with specific files to modify and code examples.

---

## 📁 API Application Changes

### 1. Security Enhancements

#### File: `api/src/app.js`
**Current State:** Basic Helmet configuration
**Change:** Add strict Content Security Policy and enhanced security headers

```javascript
// ADD/REPLACE in api/src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const routes = require("./load/routes");
const errorHandler = require("./middleware/errorHandler");
const requestContext = require("./middleware/requestContext");
const requestTimer = require("./middleware/requestTimer");
const apiRateLimiter = require("./middleware/apiRateLimiter");
const userRateLimiter = require("./middleware/userRateLimiter"); // NEW
const requestSigner = require("./middleware/requestSigner"); // NEW
const performanceMonitor = require("./middleware/performanceMonitor"); // NEW
const timeout = require("connect-timeout");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./docs/swagger");

const app = express();

app.set("trust proxy", 1);

// Security headers - ENHANCED
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
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

app.use(
  cors({
    origin: [
      "https://pos.fairywren.co.ke",
      "https://www.pos.fairywren.co.ke",
      "https://erp.fairywren.co.ke",
      "https://www.erp.fairywren.co.ke",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));

// Rate limiting - ENHANCED
app.use(apiRateLimiter);
app.use(userRateLimiter); // NEW: Per-user rate limiting

// Correlation ID and Request Timers
app.use(requestContext);
app.use(requestTimer);
app.use(performanceMonitor); // NEW: API performance tracking

// Timeout Protection
const haltOnTimedout = (req, res, next) => {
  if (!req.timedout) next();
};

app.use(timeout("30s"));
app.use(haltOnTimedout);

// Prevent accidental root access
app.get("/", (req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Swagger Documentation (only in non-production)
if (process.env.NODE_ENV !== "production") {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
}

// Apply request signing to sensitive routes
app.use("/payments", requestSigner); // NEW: Verify signed requests

app.use("/", routes);
app.use(haltOnTimedout);

// Error handler must be last
app.use(errorHandler);

module.exports = app;
```

---

#### File: `api/src/middleware/userRateLimiter.js` (NEW FILE)
**Purpose:** Per-user rate limiting in addition to IP-based

```javascript
const userRequestStore = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute per user

module.exports = (req, res, next) => {
  // Skip for unauthenticated requests (handled by IP limiter)
  if (!req.user || !req.user.id) {
    return next();
  }
  
  const key = `${req.user.id}:${Math.floor(Date.now() / WINDOW_MS)}`;
  const current = userRequestStore.get(key) || 0;
  
  if (current >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: {
        code: "USER_RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please slow down.",
      },
    });
  }
  
  userRequestStore.set(key, current + 1);
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance
    const now = Date.now();
    for (const [k, v] of userRequestStore.entries()) {
      const timestamp = parseInt(k.split(':')[1]) * WINDOW_MS;
      if (now - timestamp > WINDOW_MS * 2) {
        userRequestStore.delete(k);
      }
    }
  }
  
  next();
};
```

---

#### File: `api/src/middleware/requestSigner.js` (NEW FILE)
**Purpose:** Verify HMAC signatures for sensitive operations

```javascript
const crypto = require('crypto');

module.exports = (req, res, next) => {
  // Skip for GET requests
  if (req.method === 'GET') return next();
  
  const { timestamp, signature } = req.body;
  
  if (!timestamp || !signature) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_SIGNATURE',
        message: 'Request signature required',
      },
    });
  }
  
  // Check timestamp (prevent replay attacks)
  const now = Date.now();
  const requestTime = parseInt(timestamp);
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) { // 5 minute window
    return res.status(400).json({
      success: false,
      error: {
        code: 'EXPIRED_SIGNATURE',
        message: 'Request signature expired',
      },
    });
  }
  
  // Verify signature
  const secret = process.env.REQUEST_SIGNING_SECRET;
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${payload}`)
    .digest('hex');
  
  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_SIGNATURE',
        message: 'Invalid request signature',
      },
    });
  }
  
  next();
};
```

---

#### File: `api/src/middleware/performanceMonitor.js` (NEW FILE)
**Purpose:** Track API performance metrics

```javascript
const logger = require("../utils/logger");

module.exports = (req, res, next) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6; // Convert to milliseconds
    
    logger.info({
      type: 'api_performance',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration.toFixed(2),
      userId: req.user?.id,
      correlationId: req.correlationId,
    });
    
    // Alert on slow requests
    if (duration > 5000) {
      logger.warn({
        type: 'slow_request',
        method: req.method,
        path: req.path,
        durationMs: duration.toFixed(2),
      });
    }
  });
  
  next();
};
```

---

### 2. Enhanced Audit Logging

#### File: `api/src/middleware/audit.middleware.js` (NEW FILE)
**Purpose:** Comprehensive audit logging for all financial operations

```javascript
const auditRepo = require("../modules/audit/audit.repository");

const SENSITIVE_OPERATIONS = [
  { path: '/bills', methods: ['POST', 'PATCH', 'DELETE'] },
  { path: '/payments', methods: ['POST'] },
  { path: '/bills/:id/pay', methods: ['POST'] },
  { path: '/bills/:id/void', methods: ['DELETE'] },
  { path: '/bills/:id/rounds', methods: ['POST'] },
];

module.exports = () => async (req, res, next) => {
  // Check if this is a sensitive operation
  const isSensitive = SENSITIVE_OPERATIONS.some(op => {
    const pathMatch = req.path.match(new RegExp(op.path.replace(/:id/, '[^/]+')));
    return pathMatch && op.methods.includes(req.method);
  });
  
  if (!isSensitive) return next();
  
  const startTime = Date.now();
  
  // Capture original json method
  const originalJson = res.json.bind(res);
  let responseBody = null;
  
  res.json = (data) => {
    responseBody = data;
    return originalJson(data);
  };
  
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    
    try {
      await auditRepo.log({
        entity: req.path.split('/')[1],
        entity_id: req.params.id || responseBody?.data?.id,
        action: `${req.method}_${req.path.replace(/\//g, '_').toUpperCase()}`,
        performed_by: req.user?.id,
        correlation_id: req.correlationId,
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          requestBody: sanitizeRequestBody(req.body),
          responseSuccess: responseBody?.success,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });
    } catch (err) {
      logger.error({ type: 'audit_log_failed', error: err.message });
    }
  });
  
  next();
};

function sanitizeRequestBody(body) {
  if (!body) return null;
  
  // Remove sensitive fields
  const sanitized = { ...body };
  delete sanitized.signature;
  delete sanitized.timestamp;
  
  return sanitized;
}
```

---

#### File: `api/src/modules/audit/audit.repository.js` (MODIFY)
**Add:** Batch insert capability for high-volume logging

```javascript
const getSupabase = require("../../config/supabase");

// Add batch buffer for audit logs
const auditBuffer = [];
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds

// Flush buffer periodically
setInterval(flushAuditBuffer, FLUSH_INTERVAL);

exports.log = async (payload) => {
  // Add to buffer
  auditBuffer.push({
    ...payload,
    created_at: new Date().toISOString(),
  });
  
  // Flush if buffer is full
  if (auditBuffer.length >= BATCH_SIZE) {
    await flushAuditBuffer();
  }
};

async function flushAuditBuffer() {
  if (auditBuffer.length === 0) return;
  
  const supabase = getSupabase();
  const logsToInsert = [...auditBuffer];
  auditBuffer.length = 0; // Clear buffer
  
  const { error } = await supabase
    .from("audit_logs")
    .insert(logsToInsert);
  
  if (error) {
    console.error("Failed to write audit logs:", error);
    // Re-add to buffer for retry
    auditBuffer.unshift(...logsToInsert);
  }
}
```

---

### 3. Bill Service Enhancements

#### File: `api/src/modules/bills/bills.service.js` (MODIFY)
**Add:** Real-time broadcast capability

```javascript
const repo = require("./bills.repository");
const auditRepo = require("../audit/audit.repository");
const inventoryService = require("../inventory/services/inventory.sale.service");
const {
  AddRoundDTO,
  CreateBillDTO,
  UpdateBillStatusDTO,
  VoidBillDTO,
} = require("./bills.dto");

// Get Supabase client for broadcasting
const getSupabase = require("../../config/supabase");

/* ---------- Bills ---------- */
exports.createBill = async (payload, context) => {
  const dto = CreateBillDTO(payload);
  const { data, error } = await repo.createBill({
    customer_name: dto.customer_name,
    status: "open",
    created_by: context.userId,
  });

  if (error) throw new Error("FAILED_TO_CREATE_BILL");

  // Broadcast to all connected clients
  await broadcastChange('bills', 'INSERT', data);

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

  // Broadcast the void action
  await broadcastChange('bills', 'UPDATE', { id, status: 'void' });

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
  const dto = AddRoundDTO(payload);

  if (!dto.items.length) {
    throw new Error("INVALID_ROUND_DATA");
  }

  await inventoryService.assertStockAvailableForBill(billId, dto.items);
  const roundNumber = await repo.getNextRoundNumber(billId);

  const { data: round, error: roundError } = await repo.createRound({
    bill_id: billId,
    round_number: roundNumber,
    created_by: context.userId,
  });

  if (roundError) {
    throw new Error("FAILED_TO_CREATE_ROUND");
  }

  const items = dto.items.map((item) => ({
    round_id: round.id,
    product_id: item.id,
    quantity: item.quantity,
    price: item.price,
  }));

  const { error: itemsError } = await repo.insertRoundItems(items);
  if (itemsError) throw new Error("FAILED_TO_ADD_ROUND_ITEMS");

  const { error: saleError } = await repo.postRoundSale(round.id);
  if (saleError) {
    throw new Error("FAILED_TO_POST_ROUND_SALE");
  }

  // Broadcast round addition
  await broadcastChange('rounds', 'INSERT', {
    ...round,
    bill_id: billId,
    items,
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

// Helper function to broadcast changes
async function broadcastChange(table, event, data) {
  try {
    const supabase = getSupabase();
    await supabase.channel('system').send({
      type: 'broadcast',
      event: `${table}:${event}`,
      payload: { data, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    // Don't fail the operation if broadcast fails
    console.error('Broadcast failed:', err);
  }
}
```

---

## 📱 POS Application Changes

### 1. State Management Migration

#### Install Dependencies
```bash
cd pos
npm install @tanstack/react-query @tanstack/react-query-devtools
```

---

#### File: `pos/src/main.jsx` (MODIFY)
**Add:** QueryClientProvider setup

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client");
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.jsx";
import "./index.css";

// Create Query Client with optimized defaults for POS
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Auto-refresh every minute
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      suspense: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
);
```

---

### 2. New Hooks with TanStack Query

#### File: `pos/src/hooks/useBillsQuery.js` (NEW FILE)
**Purpose:** Replace useBills with TanStack Query version

```javascript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BillsService } from "@/services/bills.service";
import toast from "react-hot-toast";

const BILLS_QUERY_KEY = "bills";

export const useBillsQuery = (params = {}) => {
  const queryClient = useQueryClient();

  // Query for fetching bills
  const billsQuery = useQuery({
    queryKey: [BILLS_QUERY_KEY, params],
    queryFn: ({ signal }) => BillsService.list(params, signal),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
  });

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: BillsService.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [BILLS_QUERY_KEY] });
      toast.success(`Bill created for ${data.customer_name}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create bill");
    },
  });

  // Add round mutation with optimistic update
  const addRoundMutation = useMutation({
    mutationFn: ({ billId, items }) => BillsService.addRound(billId, { items }),
    
    onMutate: async ({ billId, items }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [BILLS_QUERY_KEY] });
      
      // Snapshot previous value
      const previousBills = queryClient.getQueryData([BILLS_QUERY_KEY, params]);
      
      // Create optimistic round
      const optimisticRound = {
        id: `temp-${Date.now()}`,
        round_number: Date.now(),
        created_at: new Date().toISOString(),
        round_items: items.map(item => ({
          ...item,
          product: { id: item.id, name: item.productName },
        })),
        optimistic: true,
      };
      
      // Optimistically update
      queryClient.setQueryData([BILLS_QUERY_KEY, params], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map(bill => 
            bill.id === billId 
              ? { ...bill, rounds: [...(bill.rounds || []), optimisticRound] }
              : bill
          ),
        };
      });
      
      return { previousBills };
    },
    
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousBills) {
        queryClient.setQueryData([BILLS_QUERY_KEY, params], context.previousBills);
      }
      toast.error(err.message || "Failed to add round");
    },
    
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: [BILLS_QUERY_KEY] });
    },
    
    onSuccess: () => {
      toast.success("Round added successfully!");
    },
  });

  // Void bill mutation
  const voidBillMutation = useMutation({
    mutationFn: BillsService.void,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BILLS_QUERY_KEY] });
      toast.success("Bill voided successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to void bill");
    },
  });

  // Pay bill mutation
  const payBillMutation = useMutation({
    mutationFn: ({ billId, payload }) => BillsService.pay(billId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BILLS_QUERY_KEY] });
      toast.success("Payment processed successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to process payment");
    },
  });

  return {
    // Query state
    bills: billsQuery.data?.data || [],
    loading: billsQuery.isLoading,
    error: billsQuery.error,
    isFetching: billsQuery.isFetching,
    
    // Actions
    refetch: billsQuery.refetch,
    createBill: createBillMutation.mutateAsync,
    addRound: addRoundMutation.mutateAsync,
    voidBill: voidBillMutation.mutateAsync,
    payBill: payBillMutation.mutateAsync,
    
    // Mutation states
    isCreating: createBillMutation.isPending,
    isAddingRound: addRoundMutation.isPending,
    isVoiding: voidBillMutation.isPending,
    isPaying: payBillMutation.isPending,
  };
};
```

---

### 3. Real-Time Subscription Hook

#### File: `pos/src/hooks/useRealtimeSync.js` (NEW FILE)
**Purpose:** Subscribe to real-time updates from Supabase

```javascript
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase"; // NEW: Create Supabase client
import toast from "react-hot-toast";

export const useRealtimeSync = (userId) => {
  const queryClient = useQueryClient();
  const channelRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Create a single channel for all subscriptions
    const channel = supabase.channel("pos-sync");
    channelRef.current = channel;

    // Subscribe to bill changes
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bills",
        },
        (payload) => {
          // Invalidate bills query
          queryClient.invalidateQueries({ queryKey: ["bills"] });

          // Show notifications for relevant events
          switch (payload.eventType) {
            case "INSERT":
              if (payload.new.created_by !== userId) {
                toast.info(`New bill: ${payload.new.customer_name}`, {
                  duration: 3000,
                });
              }
              break;
            case "UPDATE":
              if (
                payload.new.status === "awaiting_confirmation" &&
                payload.old.status !== "awaiting_confirmation"
              ) {
                toast.info("New payment awaiting confirmation", {
                  icon: "💰",
                  duration: 5000,
                });
              }
              break;
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payments",
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["bills"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
        },
        (payload) => {
          // Check for low stock
          if (
            payload.new.current_stock <= payload.new.reorder_level &&
            payload.old.current_stock > payload.new.reorder_level
          ) {
            toast.warning(
              `Low stock alert: ${payload.new.name} (${payload.new.current_stock} remaining)`,
              { duration: 5000 }
            );
          }
          // Invalidate products query
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] Connected to sync channel");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          console.warn("[Realtime] Connection lost, falling back to polling");
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userId, queryClient]);

  // Return connection status for UI indicators
  return {
    isConnected: channelRef.current?.state === "joined",
  };
};
```

---

#### File: `pos/src/lib/supabase.js` (NEW FILE)
**Purpose:** Create Supabase client for real-time subscriptions

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

---

### 4. Request Deduplication

#### File: `pos/src/api/requestCache.js` (NEW FILE)
**Purpose:** Deduplicate identical concurrent requests

```javascript
const pendingRequests = new Map();

/**
 * Deduplicate concurrent requests with the same key
 * @param {string} key - Unique identifier for the request
 * @param {Function} requestFn - Async function that makes the request
 * @returns {Promise} The request result
 */
export const dedupeRequest = async (key, requestFn) => {
  // Check if there's already a pending request with this key
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Create the promise
  const promise = requestFn().finally(() => {
    // Clean up when done
    pendingRequests.delete(key);
  });

  // Store the pending promise
  pendingRequests.set(key, promise);

  return promise;
};

/**
 * Clear all pending requests (useful for logout)
 */
export const clearPendingRequests = () => {
  pendingRequests.clear();
};
```

---

#### File: `pos/src/services/bills.service.js` (MODIFY)
**Add:** Request deduplication

```javascript
import api from "@/api";
import { dedupeRequest } from "@/api/requestCache";
import normalizeError from "@/utils/errorFormatter";

const BASE_PATH = "/bills";

export const BillsService = {
  async list(params = {}, signal) {
    const cacheKey = `${BASE_PATH}:list:${JSON.stringify(params)}`;
    
    return dedupeRequest(cacheKey, async () => {
      try {
        const { data } = await api.get(BASE_PATH, { params, signal });
        return data;
      } catch (error) {
        throw normalizeError(error, "Error fetching bills.");
      }
    });
  },

  async getById(billId, signal) {
    const cacheKey = `${BASE_PATH}:get:${billId}`;
    
    return dedupeRequest(cacheKey, async () => {
      try {
        const { data } = await api.get(`${BASE_PATH}/${billId}`, { signal });
        return data;
      } catch (error) {
        throw normalizeError(error, "Error fetching bill details.");
      }
    });
  },

  async create(payload, signal) {
    try {
      const { data } = await api.post(BASE_PATH, payload, { signal });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error creating bill.");
    }
  },

  async updateStatus(billId, payload, signal) {
    try {
      const { data } = await api.patch(
        `${BASE_PATH}/${billId}/status`,
        payload,
        { signal }
      );
      return data;
    } catch (error) {
      throw normalizeError(error, "Error updating bill status.");
    }
  },

  async void(billId, signal) {
    try {
      const { data } = await api.delete(`${BASE_PATH}/${billId}`, { signal });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error voiding bill.");
    }
  },

  async getMyStats(period = "month", signal) {
    const cacheKey = `${BASE_PATH}:stats:${period}`;
    
    return dedupeRequest(cacheKey, async () => {
      try {
        const { data } = await api.get(`${BASE_PATH}/my-stats`, {
          params: { period },
          signal,
        });
        return data;
      } catch (error) {
        throw normalizeError(error, "Error fetching bill stats.");
      }
    });
  },

  async addRound(billId, payload, signal) {
    try {
      const { data } = await api.post(`${BASE_PATH}/${billId}/rounds`, payload, {
        signal,
      });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error adding bill round.");
    }
  },

  async pay(billId, payload, signal) {
    try {
      const { data } = await api.post(`${BASE_PATH}/${billId}/pay`, payload, {
        signal,
      });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error processing payment.");
    }
  },
};
```

---

### 5. Request Signing for Payments

#### File: `pos/src/utils/requestSigner.js` (NEW FILE)
**Purpose:** Sign sensitive requests

```javascript
import CryptoJS from "crypto-js";

const REQUEST_SECRET = import.meta.env.VITE_REQUEST_SIGNING_SECRET;

export const signRequest = (payload) => {
  const timestamp = Date.now();
  const data = `${timestamp}:${JSON.stringify(payload)}`;
  const signature = CryptoJS.HmacSHA256(data, REQUEST_SECRET).toString();

  return {
    timestamp,
    signature,
  };
};
```

---

#### File: `pos/src/services/payment.service.js` (MODIFY)
**Add:** Request signing

```javascript
import api from "@/api";
import { signRequest } from "@/utils/requestSigner";
import normalizeError from "@/utils/errorFormatter";

export const PaymentService = {
  async process({ billId, payments }) {
    try {
      const payload = { billId, payments };
      const { timestamp, signature } = signRequest(payload);

      const { data } = await api.post("/payments/process", {
        ...payload,
        timestamp,
        signature,
      });

      return data;
    } catch (error) {
      throw normalizeError(error, "Error processing payment.");
    }
  },
};
```

---

### 6. Main App Integration

#### File: `pos/src/App.jsx` (MODIFY)
**Add:** Real-time sync integration

```jsx
import "./App.css";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import { useRealtimeSync } from "./hooks/useRealtimeSync"; // NEW
import LoginScreen from "./pages/LoginScreen";
import MainLayout from "./components/layout/MainLayout";
import BetaMainLayout from "./beta/layout/BetaMainLayout";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import { ThemeProvider } from "./context/ThemeProvider";

const AppContent = () => {
  const { user, uiVersion } = useAuth();
  
  // Enable real-time sync when authenticated
  const { isConnected } = useRealtimeSync(user?.id); // NEW

  if (!user) {
    return <LoginScreen />;
  }

  return uiVersion === "beta" ? <BetaMainLayout /> : <MainLayout />;
};

const ThemedContent = () => {
  const { theme } = useTheme();

  const toastStyle =
    theme === "light"
      ? {
          background: "#ffffff",
          color: "#1F2937",
          border: "1px solid #e5e7eb",
        }
      : {
          background: "#1F2937",
          color: "#fff",
          border: "1px solid #FF6B9D",
        };

  return (
    <div className={`theme-${theme}`}>
      <AppContent />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: toastStyle,
          success: {
            iconTheme: {
              primary: "#10B981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemedContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
```

---

### 7. POSScreen Migration to New Hooks

#### File: `pos/src/pages/POSScreen.jsx` (MODIFY)
**Replace:** useBills with useBillsQuery

```javascript
// REPLACE imports
import { useAuth } from "../hooks/useAuth";
import { useBillsQuery } from "../hooks/useBillsQuery"; // NEW
import { useProductsQuery } from "../hooks/useProductsQuery"; // NEW (similar pattern)
import { useCategoriesQuery } from "../hooks/useCategoriesQuery"; // NEW

// In component
const POSScreen = () => {
  const { user } = useAuth();
  const {
    products,
    loading: productsLoading,
    refetch: refetchProducts,
  } = useProductsQuery({ active: true });
  
  const { categories, loading: categoriesLoading } = useCategoriesQuery({
    active: true,
  });
  
  // REPLACE useBills with useBillsQuery
  const {
    bills,
    loading: billsLoading,
    error: billsError,
    refetch: reloadBills,
    createBill,
    addRound,
    voidBill,
    payBill,
    isCreating,
    isAddingRound,
    isVoiding,
    isPaying,
  } = useBillsQuery();

  // Rest of component logic remains the same
  // ...
};
```

---

## 🖥️ ERP Application Changes

### 1. Manager Dashboard Real-Time Updates

#### File: `erp/src/hooks/useLiveZReport.js` (NEW FILE)
**Purpose:** Live updating Z-report for manager dashboard

```javascript
import { useEffect, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReportsService } from "@/services/reports.service";
import { supabase } from "@/lib/supabase";

export const useLiveZReport = (date) => {
  const queryClient = useQueryClient();
  const [liveUpdates, setLiveUpdates] = useState(0);

  // Initial fetch using TanStack Query
  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["z-report", date],
    queryFn: () => ReportsService.getZReport(date),
    staleTime: 0, // Always consider stale for live updates
    refetchInterval: 60 * 1000, // Fallback polling every minute
    enabled: !!date,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!date) return;

    const subscription = supabase
      .channel(`z-report:${date}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payments",
          filter: `created_at=gte.${date}T00:00:00`,
        },
        (payload) => {
          // Trigger refetch when new payments come in
          queryClient.invalidateQueries({ queryKey: ["z-report", date] });
          setLiveUpdates((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bills",
          filter: `created_at=gte.${date}T00:00:00`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["z-report", date] });
          setLiveUpdates((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [date, queryClient]);

  return {
    data: reportData,
    loading: isLoading,
    error,
    refetch,
    liveUpdates,
    isLive: liveUpdates > 0,
  };
};
```

---

### 2. Cross-Device Bill Notifications

#### File: `erp/src/hooks/useBillNotifications.js` (NEW FILE)
**Purpose:** Notify managers of important bill events

```javascript
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export const useBillNotifications = (userRole) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only for managers/admins
    if (!["manager", "admin"].includes(userRole)) return;

    const channel = supabase
      .channel("bill-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bills",
          filter: "status=eq.awaiting_confirmation",
        },
        (payload) => {
          toast.info(
            `Bill #${payload.new.id.slice(-6)} for ${payload.new.customer_name} awaiting payment confirmation`,
            {
              duration: 10000,
              icon: "💰",
              action: {
                label: "View",
                onClick: () => {
                  window.location.href = `/pos?bill=${payload.new.id}`;
                },
              },
            }
          );
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ["pending-confirmations"] });
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [userRole, queryClient]);
};
```

---

### 3. Inventory Sync Hook

#### File: `erp/src/hooks/useInventorySync.js` (NEW FILE)
**Purpose:** Sync inventory changes between ERP and POS

```javascript
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export const useInventorySync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("inventory-sync")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
        },
        (payload) => {
          // Invalidate product queries
          queryClient.invalidateQueries({ queryKey: ["products"] });
          queryClient.invalidateQueries({ queryKey: ["inventory"] });

          // Notify of significant changes
          const stockChange =
            payload.new.current_stock - payload.old.current_stock;
          
          if (stockChange !== 0) {
            toast.info(
              `Stock updated: ${payload.new.name} (${
                stockChange > 0 ? "+" : ""
              }${stockChange})`,
              { duration: 3000 }
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "products",
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
          toast.success(`New product added: ${payload.new.name}`);
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }, [queryClient]);
};
```

---

## 📊 Environment Variables

### POS Application (`pos/.env`)
```env
# Existing
VITE_SERVER_URL=https://api.fairywren.co.ke

# NEW: Supabase for Realtime
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# NEW: Request signing
VITE_REQUEST_SIGNING_SECRET=your-signing-secret
```

### API Application (`api/.env`)
```env
# Existing
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-key

# NEW: Request signing
REQUEST_SIGNING_SECRET=your-signing-secret

# NEW: Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
USER_RATE_LIMIT_MAX=60
```

### ERP Application (`erp/.env`)
```env
# Existing
VITE_API_URL=https://api.fairywren.co.ke

# NEW: Supabase for Realtime
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🎯 Implementation Priority

### Week 1: Foundation
| Application | File | Priority |
|-------------|------|----------|
| API | `middleware/userRateLimiter.js` | HIGH |
| API | `middleware/performanceMonitor.js` | HIGH |
| API | `app.js` (security headers) | HIGH |
| POS | Install TanStack Query | HIGH |
| POS | `main.jsx` (QueryClient setup) | HIGH |

### Week 2: Real-Time Features
| Application | File | Priority |
|-------------|------|----------|
| POS | `lib/supabase.js` | HIGH |
| POS | `hooks/useRealtimeSync.js` | HIGH |
| POS | `App.jsx` (integration) | HIGH |
| API | `bills.service.js` (broadcast) | MEDIUM |
| ERP | `hooks/useLiveZReport.js` | MEDIUM |

### Week 3: State Management Migration
| Application | File | Priority |
|-------------|------|----------|
| POS | `hooks/useBillsQuery.js` | HIGH |
| POS | `hooks/useProductsQuery.js` | HIGH |
| POS | `pages/POSScreen.jsx` (migrate) | HIGH |
| POS | `api/requestCache.js` | MEDIUM |
| POS | `services/bills.service.js` (dedupe) | MEDIUM |

### Week 4: Security & Polish
| Application | File | Priority |
|-------------|------|----------|
| API | `middleware/requestSigner.js` | HIGH |
| POS | `utils/requestSigner.js` | HIGH |
| POS | `services/payment.service.js` | HIGH |
| API | `middleware/audit.middleware.js` | MEDIUM |
| API | `modules/audit/audit.repository.js` | MEDIUM |

---

## ✅ Verification Checklist

### API
- [ ] User rate limiting working (test with 60+ requests/minute)
- [ ] Performance monitoring logging to console
- [ ] CSP headers present in responses
- [ ] Request signing rejects unsigned payment requests
- [ ] Audit logs written for all financial operations

### POS
- [ ] Bills auto-refresh when other devices create bills
- [ ] Payment confirmation notifications appear instantly
- [ ] Low stock alerts appear in real-time
- [ ] Duplicate requests are deduplicated
- [ ] Optimistic updates roll back on error

### ERP
- [ ] Z-report updates live during shift
- [ ] Manager notifications for awaiting confirmations
- [ ] Inventory changes sync across tabs
