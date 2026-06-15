import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchStockItems,
  createInventoryReceipt,
  fetchIncompleteStockTake,
  createStockTakeSession,
  recordStockTakeItem,
  fetchStockTakeItems,
  completeStockTakeSession,
  approveStockTake,
  rejectStockTake,
  fetchStockTakeReports,
  fetchStockTakeDetail,
  fetchStockTakeAdjustments,
  fetchAdjustmentInsights,
  fetchReceiptDetail,
  markReceiptPaid,
  cancelReceipt,
  fetchReorderPolicies,
  fetchReorderAlerts,
  fetchReorderSettings,
  updateReorderSettings,
  triggerReorderRefresh,
  setManualReorderLevel,
  clearReorderOverride,
  fetchMovementAnalysis,
  fetchReorderForecast,
  fetchConvertibleProducts,
  fetchConversionHistory,
  fetchTotSize,
  executeConversion,
} from "@/services/inventory.service";

export const useStockItems = (params = {}) => {
  return useQuery({
    queryKey: ["stock-items", params],
    queryFn: () => fetchStockItems(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useReceiveInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInventoryReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Inventory received successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to receive inventory");
    },
  });
};

export const useIncompleteStockTake = () => {
  return useQuery({
    queryKey: ["stock-take-incomplete"],
    queryFn: fetchIncompleteStockTake,
    staleTime: 0,
  });
};

export const useCreateStockTakeSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStockTakeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-take-incomplete"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to start stock take");
    },
  });
};

export const useStockTakeItems = (sessionId) => {
  return useQuery({
    queryKey: ["stock-take-items", sessionId],
    queryFn: () => fetchStockTakeItems(sessionId),
    enabled: !!sessionId,
    staleTime: 0,
  });
};

export const useRecordStockTakeItem = (sessionId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => recordStockTakeItem(sessionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stock-take-items", sessionId],
      });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to record item");
    },
  });
};

export const useCompleteStockTake = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeStockTakeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-take-incomplete"] });
      queryClient.invalidateQueries({ queryKey: ["stock-take-reports"] });
      toast.success("Stock take completed");
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || "Failed to complete stock take",
      );
    },
  });
};

export const useApproveStockTake = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveStockTake,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-take-reports"] });
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      toast.success("Stock take approved");
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || "Failed to approve stock take",
      );
    },
  });
};

export const useRejectStockTake = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectStockTake,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-take-reports"] });
      toast.success("Stock take rejected");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to reject stock take");
    },
  });
};

export const useStockTakeReports = (params = {}) => {
  return useQuery({
    queryKey: ["stock-take-reports", params],
    queryFn: () => fetchStockTakeReports(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useStockTakeDetail = (id) => {
  return useQuery({
    queryKey: ["stock-take-detail", id],
    queryFn: () => fetchStockTakeDetail(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useStockTakeAdjustments = (params = {}) => {
  return useQuery({
    queryKey: ["stock-take-adjustments", params],
    queryFn: () => fetchStockTakeAdjustments(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAdjustmentInsights = (params = {}) => {
  return useQuery({
    queryKey: ["adjustment-insights", params],
    queryFn: () => fetchAdjustmentInsights(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useReceiptDetail = (id) => {
  return useQuery({
    queryKey: ["receipt-detail", id],
    queryFn: () => fetchReceiptDetail(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useMarkReceiptPaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markReceiptPaid,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["receipt-detail", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["product-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["pending-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-payments"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-statement"] });
      toast.success("Receipt marked as paid");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to mark as paid");
    },
  });
};

export const useCancelReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelReceipt,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["receipt-detail", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["pending-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-statement"] });
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      toast.success("Receipt cancelled and inventory reversed");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to cancel receipt");
    },
  });
};

/* ======================================================
   REORDER LEVEL POLICIES
   ====================================================== */

export const useReorderPolicies = () => {
  return useQuery({
    queryKey: ["reorder-policies"],
    queryFn: fetchReorderPolicies,
    staleTime: 5 * 60 * 1000,
  });
};

export const useMovementAnalysis = () => {
  return useQuery({
    queryKey: ["movement-analysis"],
    queryFn: fetchMovementAnalysis,
    staleTime: 5 * 60 * 1000,
  });
};

export const useReorderForecast = (lookbackDays = 14) => {
  return useQuery({
    queryKey: ["reorder-forecast", lookbackDays],
    queryFn: () => fetchReorderForecast(lookbackDays),
    staleTime: 5 * 60 * 1000,
  });
};

export const useReorderAlerts = () => {
  return useQuery({
    queryKey: ["reorder-alerts"],
    queryFn: fetchReorderAlerts,
    staleTime: 2 * 60 * 1000,
  });
};

export const useReorderSettings = () => {
  return useQuery({
    queryKey: ["reorder-settings"],
    queryFn: fetchReorderSettings,
    staleTime: 10 * 60 * 1000,
  });
};

export const useUpdateReorderSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateReorderSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reorder-settings"] });
      toast.success("Reorder settings saved");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update settings");
    },
  });
};

export const useRefreshReorderLevels = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: triggerReorderRefresh,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reorder-policies"] });
      queryClient.invalidateQueries({ queryKey: ["reorder-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      toast.success(`Reorder levels recalculated for ${data} products`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to refresh reorder levels");
    },
  });
};

export const useSetManualReorderLevel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setManualReorderLevel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reorder-policies"] });
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      toast.success("Manual reorder level set");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to set reorder level");
    },
  });
};

export const useClearReorderOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearReorderOverride,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reorder-policies"] });
      toast.success("Override cleared — will recalculate on next refresh");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to clear override");
    },
  });
};

/* ======================================================
   PRODUCT CONVERSIONS
   ====================================================== */

export const useConvertibleProducts = () => {
  return useQuery({
    queryKey: ["convertible-products"],
    queryFn: fetchConvertibleProducts,
    staleTime: 2 * 60 * 1000,
  });
};

export const useConversionHistory = () => {
  return useQuery({
    queryKey: ["conversion-history"],
    queryFn: fetchConversionHistory,
    staleTime: 60 * 1000,
  });
};

export const useTotSize = () => {
  return useQuery({
    queryKey: ["tot-size"],
    queryFn: fetchTotSize,
    staleTime: 10 * 60 * 1000,
  });
};

export const useExecuteConversion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: executeConversion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      queryClient.invalidateQueries({ queryKey: ["convertible-products"] });
      queryClient.invalidateQueries({ queryKey: ["conversion-history"] });
      toast.success("Product converted successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to convert product");
    },
  });
};
