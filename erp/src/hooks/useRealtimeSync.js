import { useEffect, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

/**
 * Hook to enable real-time synchronization for ERP
 * Provides manager notifications for payments, inventory alerts, etc.
 */
export const useRealtimeSync = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const userPermissions = user?.permissions || [];
  const queryClient = useQueryClient();
  
  const { isConnected, subscribe, unsubscribe, emit } = useSocket();

  // Check if user has manager permissions
  const canApprovePayments = userPermissions.includes("approve_payments");
  const isManager = ["manager", "admin"].includes(userRole);

  // Handle bill created
  const handleBillCreated = useCallback((data) => {
    console.log("[Realtime] Bill created:", data);
    
    // Show notification for managers
    if (isManager && data.createdBy !== userId) {
      toast.success(`New POS bill: ${data.bill?.customer_name}`, {
        duration: 4000,
      });
    }
  }, [isManager, userId]);

  // Handle bill voided
  const handleBillVoided = useCallback((data) => {
    console.log("[Realtime] Bill voided:", data);
    
    if (isManager) {
      toast.success("A bill was voided at POS", { duration: 3000 });
    }
  }, [isManager]);

  // Handle round created
  const handleRoundCreated = useCallback((data) => {
    console.log("[Realtime] Round created:", data);
  }, []);

  // Handle payment awaiting confirmation (MANAGER ONLY)
  const handlePaymentAwaiting = useCallback((data) => {
    console.log("[Realtime] Payment awaiting confirmation:", data);
    
    // Only show to managers who can approve
    if (canApprovePayments) {
      toast.success(
        `Payment needs approval: ${data.customerName} (Bill #${data.billId?.slice(-6)})`,
        {
          duration: 10000,
          icon: "💰",
        }
      );
    }
  }, [canApprovePayments]);

  // Handle payment created
  const handlePaymentCreated = useCallback((data) => {
    console.log("[Realtime] Payment created:", data);
  }, []);

  // Handle stock changed
  const handleStockChanged = useCallback((data) => {
    console.log("[Realtime] Stock changed:", data);
  }, []);

  // Handle low stock alert
  const handleLowStock = useCallback((data) => {
    console.log("[Realtime] Low stock alert:", data);
    
    // Show to managers
    if (isManager) {
      toast.error(
        `Low stock alert: ${data.productName} (${data.currentStock} remaining)`,
        { duration: 6000 }
      );
    }
  }, [isManager]);

  // Handle stock take awaiting approval (MANAGER ONLY)
  const handleStockTakeAwaitingApproval = useCallback((data) => {
    console.log("[Realtime] Stock take awaiting approval:", data);
    
    if (userPermissions.includes("approve_stock_take")) {
      toast.success(
        `Stock take needs approval: ${data.stockTakeName}`,
        {
          duration: 10000,
          icon: "📋",
        }
      );
    }
  }, [userPermissions]);

  // Handle stock take approved
  const handleStockTakeApproved = useCallback((data) => {
    console.log("[Realtime] Stock take approved:", data);
    
    toast.success(
      `Stock take approved: ${data.stockTakeName}`,
      { duration: 4000 }
    );
    
    // Trigger inventory refresh
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  }, []);

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
    console.log("[Realtime] Bill changed:", data);
  }, []);

  // Set up subscriptions
  useEffect(() => {
    if (!isConnected) {
      console.log("[Realtime] Waiting for socket connection...");
      return;
    }
    
    if (!userId) {
      console.log("[Realtime] Waiting for user authentication...");
      return;
    }

    console.log("[Realtime] Setting up subscriptions for user:", userId, "Role:", userRole);

    // Subscribe to channels
    emit("subscribe:bills");
    emit("subscribe:inventory");

    // Register listeners
    subscribe("bill:changed", handleBillChanged);
    subscribe("bill:created", handleBillCreated);
    subscribe("bill:voided", handleBillVoided);
    subscribe("round:created", handleRoundCreated);
    subscribe("payment:awaiting_confirmation", handlePaymentAwaiting);
    subscribe("payment:created", handlePaymentCreated);
    subscribe("inventory:stock_changed", handleStockChanged);
    subscribe("inventory:low_stock", handleLowStock);
    subscribe("stocktake:awaiting_approval", handleStockTakeAwaitingApproval);
    subscribe("stocktake:approved", handleStockTakeApproved);
    subscribe("stocktake:rejected", handleStockTakeRejected);

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
      unsubscribe("stocktake:awaiting_approval", handleStockTakeAwaitingApproval);
      unsubscribe("stocktake:approved", handleStockTakeApproved);
      unsubscribe("stocktake:rejected", handleStockTakeRejected);
      
      emit("unsubscribe:bills");
      emit("unsubscribe:inventory");
    };
  }, [
    isConnected,
    userId,
    userRole,
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
    handleStockTakeAwaitingApproval,
    handleStockTakeApproved,
    handleStockTakeRejected,
  ]);

  return { isConnected };
};
