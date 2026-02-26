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
  fetchReceiptDetail,
  markReceiptPaid,
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
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["receipt-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["product-purchases"] });
      toast.success("Receipt marked as paid");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to mark as paid");
    },
  });
};
