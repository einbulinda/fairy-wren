const { Client } = require("pg");
const { broadcast } = require("./socket.server");

let notifyClient = null;

function handleBillChange(event, newRow, oldRow) {
  broadcast("bill:changed", {
    event,
    bill: newRow,
    old: oldRow,
    timestamp: new Date().toISOString(),
  });

  if (event === "INSERT") {
    broadcast("bill:created", {
      bill: newRow,
      timestamp: new Date().toISOString(),
    });
  }

  if (event === "UPDATE") {
    if (
      newRow.status === "awaiting_confirmation" &&
      oldRow?.status !== "awaiting_confirmation"
    ) {
      broadcast(
        "payment:awaiting_confirmation",
        {
          billId: newRow.id,
          customerName: newRow.customer_name,
          timestamp: new Date().toISOString(),
        },
        { permissions: ["approve_payments"] }
      );
    }

    if (newRow.status === "void" && oldRow?.status !== "void") {
      broadcast("bill:voided", {
        billId: newRow.id,
        customerName: newRow.customer_name,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

function handlePaymentInsert(newRow) {
  broadcast("payment:created", {
    payment: newRow,
    timestamp: new Date().toISOString(),
  });
}

function handleProductUpdate(newRow, oldRow) {
  if (newRow.current_stock !== oldRow?.current_stock) {
    broadcast("inventory:stock_changed", {
      productId: newRow.id,
      productName: newRow.name,
      oldStock: oldRow?.current_stock,
      newStock: newRow.current_stock,
      reorderLevel: newRow.reorder_level,
      timestamp: new Date().toISOString(),
    });

    if (
      newRow.current_stock <= newRow.reorder_level &&
      (oldRow?.current_stock ?? Infinity) > newRow.reorder_level
    ) {
      broadcast("inventory:low_stock", {
        productId: newRow.id,
        productName: newRow.name,
        currentStock: newRow.current_stock,
        reorderLevel: newRow.reorder_level,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

function handleStockTakeUpdate(newRow, oldRow) {
  if (newRow.status === "pending_approval" && oldRow?.status !== "pending_approval") {
    broadcast(
      "stocktake:awaiting_approval",
      {
        stockTakeId: newRow.id,
        stockTakeName: newRow.stock_take_name,
        submittedBy: newRow.created_by,
        timestamp: new Date().toISOString(),
      },
      { permissions: ["approve_stock_take"] }
    );
  }

  if (newRow.status === "approved" && oldRow?.status !== "approved") {
    broadcast("stocktake:approved", {
      stockTakeId: newRow.id,
      stockTakeName: newRow.stock_take_name,
      approvedBy: newRow.approved_by,
      timestamp: new Date().toISOString(),
    });
  }

  if (newRow.status === "rejected" && oldRow?.status !== "rejected") {
    broadcast("stocktake:rejected", {
      stockTakeId: newRow.id,
      stockTakeName: newRow.stock_take_name,
      rejectedBy: newRow.approved_by,
      reason: newRow.notes || "",
      timestamp: new Date().toISOString(),
    });
  }
}

function dispatchNotification(payload) {
  const { table, event, new: newRow, old: oldRow } = payload;

  if (table === "bills") {
    handleBillChange(event, newRow, oldRow);
  } else if (table === "payments" && event === "INSERT") {
    handlePaymentInsert(newRow);
  } else if (table === "products" && event === "UPDATE") {
    handleProductUpdate(newRow, oldRow);
  } else if (table === "stock_takes" && event === "UPDATE") {
    handleStockTakeUpdate(newRow, oldRow);
  }
}

async function initializePgSubscriber() {
  notifyClient = new Client({ connectionString: process.env.DATABASE_URL });

  notifyClient.on("error", (err) => {
    console.error("[PG Subscriber] Client error:", err.message);
  });

  try {
    await notifyClient.connect();
    await notifyClient.query("LISTEN db_changes");

    notifyClient.on("notification", (msg) => {
      try {
        const payload = JSON.parse(msg.payload);
        dispatchNotification(payload);
      } catch (err) {
        console.error("[PG Subscriber] Failed to parse notification:", err.message);
      }
    });

    console.log("[PG Subscriber] Initialized — listening on channel db_changes");
  } catch (err) {
    console.error("[PG Subscriber] Failed to initialize:", err.message);
  }
}

async function cleanupSubscriptions() {
  if (notifyClient) {
    console.log("[PG Subscriber] Disconnecting...");
    await notifyClient.end().catch(() => {});
    notifyClient = null;
  }
}

module.exports = { initializePgSubscriber, cleanupSubscriptions };
