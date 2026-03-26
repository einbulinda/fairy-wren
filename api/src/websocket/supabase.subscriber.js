const getSupabase = require("../config/supabase");
const { broadcast } = require("./socket.server");

let subscriptions = [];

/**
 * Subscribe to Supabase real-time changes and broadcast to WebSocket clients
 */
function initializeSupabaseSubscriber() {
  try {
    const supabase = getSupabase();

    // Subscribe to bills table changes
    const billsSubscription = supabase
      .channel("api:bills")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bills" },
        (payload) => {
          console.log("[Supabase Realtime] Bill change:", payload.eventType, payload.new?.id || payload.old?.id);

          // Broadcast to all connected POS clients
          broadcast("bill:changed", {
            event: payload.eventType,
            bill: payload.new,
            old: payload.old,
            timestamp: new Date().toISOString(),
          });

          // Specific notifications based on event type
          if (payload.eventType === "INSERT") {
            broadcast("bill:created", {
              bill: payload.new,
              timestamp: new Date().toISOString(),
            });
          }

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

            // Notify when bill is voided
            if (payload.new.status === "void" && payload.old.status !== "void") {
              broadcast("bill:voided", {
                billId: payload.new.id,
                customerName: payload.new.customer_name,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Supabase Subscriber] Bills subscription status: ${status}`);
      });

    subscriptions.push(billsSubscription);

    // Subscribe to payments table changes
    const paymentsSubscription = supabase
      .channel("api:payments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payments" },
        (payload) => {
          console.log("[Supabase Realtime] Payment created:", payload.new.id);
          
          broadcast("payment:created", {
            payment: payload.new,
            timestamp: new Date().toISOString(),
          });
        }
      )
      .subscribe((status) => {
        console.log(`[Supabase Subscriber] Payments subscription status: ${status}`);
      });

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
            console.log("[Supabase Realtime] Stock changed:", payload.new.name, payload.new.current_stock);
            
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
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Supabase Subscriber] Products subscription status: ${status}`);
      });

    subscriptions.push(productsSubscription);

    // Subscribe to stock_takes table changes (for approval workflow)
    const stockTakeSubscription = supabase
      .channel("api:stock_takes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stock_takes" },
        (payload) => {
          console.log("[Supabase Realtime] Stock take updated:", payload.new.id, "Status:", payload.new.status);

          // Notify when stock take is submitted for approval
          if (payload.new.status === "pending_approval" && payload.old.status !== "pending_approval") {
            broadcast(
              "stocktake:awaiting_approval",
              {
                stockTakeId: payload.new.id,
                stockTakeName: payload.new.stock_take_name,
                submittedBy: payload.new.created_by,
                timestamp: new Date().toISOString(),
              },
              { permissions: ["approve_stock_take"] }
            );
          }

          // Notify when stock take is approved
          if (payload.new.status === "approved" && payload.old.status !== "approved") {
            broadcast("stocktake:approved", {
              stockTakeId: payload.new.id,
              stockTakeName: payload.new.stock_take_name,
              approvedBy: payload.new.approved_by,
              timestamp: new Date().toISOString(),
            });
          }

          // Notify when stock take is rejected
          if (payload.new.status === "rejected" && payload.old.status !== "rejected") {
            broadcast("stocktake:rejected", {
              stockTakeId: payload.new.id,
              stockTakeName: payload.new.stock_take_name,
              rejectedBy: payload.new.approved_by,
              reason: payload.new.notes || "",
              timestamp: new Date().toISOString(),
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Supabase Subscriber] Stock takes subscription status: ${status}`);
      });

    subscriptions.push(stockTakeSubscription);

    console.log("[Supabase Subscriber] Initialized successfully");
  } catch (error) {
    console.error("[Supabase Subscriber] Failed to initialize:", error.message);
  }
}

/**
 * Clean up subscriptions on shutdown
 */
function cleanupSubscriptions() {
  console.log("[Supabase Subscriber] Cleaning up subscriptions...");
  subscriptions.forEach((sub) => sub.unsubscribe());
  subscriptions = [];
}

module.exports = {
  initializeSupabaseSubscriber,
  cleanupSubscriptions,
};
