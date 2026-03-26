import { useEffect, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useAuth } from "./useAuth";
import toast from "react-hot-toast";

/**
 * Hook to enable real-time synchronization for POS
 * @param {Object} callbacks - Callback functions for different events
 * @param {Function} callbacks.onBillsChange - Called when bills change
 * @param {Function} callbacks.onInventoryChange - Called when inventory changes
 */
export const useRealtimeSync = (callbacks = {}) => {
  const { onBillsChange, onInventoryChange } = callbacks;
  const { user } = useAuth();
  const userId = user?.id;
  
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();

  // Handle bill created event
  const handleBillCreated = useCallback(
    (data) => {
      console.log("[Realtime] Bill created event received:", data);
      
      // Trigger bills reload
      onBillsChange?.();
      
      // Show notification if created by another user
      if (data.createdBy !== userId) {
        toast.success(`New bill: ${data.bill?.customer_name}`, {
          duration: 3000,
        });
      }
    },
    [userId, onBillsChange]
  );

  // Handle bill voided event
  const handleBillVoided = useCallback(
    (data) => {
      console.log("[Realtime] Bill voided event received:", data);
      
      // Trigger bills reload
      onBillsChange?.();
      
      if (data.voidedBy !== userId) {
        toast.success("A bill was voided", { duration: 3000 });
      }
    },
    [userId, onBillsChange]
  );

  // Handle round created event
  const handleRoundCreated = useCallback((data) => {
    console.log("[Realtime] Round created event received:", data);
    
    // Trigger bills reload
    onBillsChange?.();
    
    toast.success("Round added to bill", { duration: 2000 });
  }, [onBillsChange]);

  // Handle payment awaiting confirmation
  const handlePaymentAwaiting = useCallback((data) => {
    console.log("[Realtime] Payment awaiting confirmation:", data);
    
    // Trigger bills reload
    onBillsChange?.();
    
    toast.success(`Payment awaiting confirmation: ${data.customerName}`, {
      duration: 5000,
    });
  }, [onBillsChange]);

  // Handle payment created
  const handlePaymentCreated = useCallback((data) => {
    console.log("[Realtime] Payment created:", data);
    
    // Trigger bills reload
    onBillsChange?.();
  }, [onBillsChange]);

  // Handle stock changed event
  const handleStockChanged = useCallback((data) => {
    console.log("[Realtime] Stock changed:", data);
    
    // Trigger inventory reload
    onInventoryChange?.();
  }, [onInventoryChange]);

  // Handle low stock alert
  const handleLowStock = useCallback((data) => {
    console.log("[Realtime] Low stock alert:", data);
    toast.error(
      `Low stock: ${data.productName} (${data.currentStock} remaining)`,
      { duration: 5000 }
    );
  }, []);

  // Handle stock take approved (refresh inventory)
  const handleStockTakeApproved = useCallback((data) => {
    console.log("[Realtime] Stock take approved:", data);
    
    // Trigger inventory refresh
    onInventoryChange?.();
    
    toast.success(
      `Stock updated: ${data.stockTakeName} approved`,
      { duration: 4000 }
    );
  }, [onInventoryChange]);

  // Handle stock take rejected
  const handleStockTakeRejected = useCallback((data) => {
    console.log("[Realtime] Stock take rejected:", data);
    
    toast.error(
      `Stock take rejected: ${data.stockTakeName}`,
      { duration: 4000 }
    );
  }, []);

  // Handle generic bill changes
  const handleBillChanged = useCallback((data) => {
    console.log("[Realtime] Bill changed event received:", data);
    
    // Trigger bills reload
    onBillsChange?.();
  }, [onBillsChange]);

  // Set up subscriptions when connected and authenticated
  useEffect(() => {
    // Only subscribe if user is logged in and socket is connected
    if (!isConnected) {
      console.log("[Realtime] Waiting for socket connection...");
      return;
    }
    
    if (!userId) {
      console.log("[Realtime] Waiting for user authentication...");
      return;
    }

    console.log("[Realtime] Setting up subscriptions for user:", userId);

    // Subscribe to server channels
    emit("subscribe:bills");
    emit("subscribe:inventory");

    // Register event listeners
    subscribe("bill:changed", handleBillChanged);
    subscribe("bill:created", handleBillCreated);
    subscribe("bill:voided", handleBillVoided);
    subscribe("round:created", handleRoundCreated);
    subscribe("payment:awaiting_confirmation", handlePaymentAwaiting);
    subscribe("payment:created", handlePaymentCreated);
    subscribe("inventory:stock_changed", handleStockChanged);
    subscribe("inventory:low_stock", handleLowStock);
    subscribe("stocktake:approved", handleStockTakeApproved);
    subscribe("stocktake:rejected", handleStockTakeRejected);

    // Cleanup
    return () => {
      console.log("[Realtime] Cleaning up subscriptions");
      unsubscribe("bill:changed", handleBillChanged);
      unsubscribe("bill:created", handleBillCreated);
      unsubscribe("bill:voided", handleBillVoided);
      unsubscribe("round:created", handleRoundCreated);
      unsubscribe("payment:awaiting_confirmation", handlePaymentAwaiting);
      unsubscribe("payment:created", handlePaymentCreated);
      unsubscribe("inventory:stock_changed", handleStockChanged);
      unsubscribe("inventory:low_stock", handleLowStock);
      unsubscribe("stocktake:approved", handleStockTakeApproved);
      unsubscribe("stocktake:rejected", handleStockTakeRejected);
      
      emit("unsubscribe:bills");
      emit("unsubscribe:inventory");
    };
  }, [
    isConnected,
    userId,
    subscribe,
    unsubscribe,
    emit,
    handleBillChanged,
    handleBillCreated,
    handleBillVoided,
    handleRoundCreated,
    handlePaymentAwaiting,
    handlePaymentCreated,
    handleStockChanged,
    handleLowStock,
    handleStockTakeApproved,
    handleStockTakeRejected,
  ]);

  return { isConnected };
};
