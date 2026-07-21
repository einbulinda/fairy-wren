import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchPartners,
  createPartner,
  createExchange,
  fetchAllExchanges,
  fetchPendingExchanges,
  fetchExchangeDetail,
  approveExchange,
  rejectExchange,
} from "@/services/exchanges.service";

export const usePartners = (params = {}) => {
  return useQuery({
    queryKey: ["business-partners", params],
    queryFn: () => fetchPartners(params),
    staleTime: 60 * 1000,
  });
};

export const useCreatePartner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPartner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-partners"] });
      toast.success("Business partner added");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to add business partner");
    },
  });
};

export const useCreateExchange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createExchange,
    onSuccess: (data) => {
      if (data?.approval_status === "pending") {
        toast.success("Exchange submitted — pending approval before stock is updated");
        queryClient.invalidateQueries({ queryKey: ["pending-exchanges"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["stock-items"] });
        toast.success("Exchange recorded successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["all-exchanges"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to record exchange");
    },
  });
};

export const useAllExchanges = (params = {}) => {
  return useQuery({
    queryKey: ["all-exchanges", params],
    queryFn: () => fetchAllExchanges(params),
    staleTime: 60 * 1000,
  });
};

export const usePendingExchanges = () => {
  return useQuery({
    queryKey: ["pending-exchanges"],
    queryFn: fetchPendingExchanges,
    staleTime: 30 * 1000,
  });
};

export const useExchangeDetail = (id) => {
  return useQuery({
    queryKey: ["exchange-detail", id],
    queryFn: () => fetchExchangeDetail(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useApproveExchange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveExchange,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["pending-exchanges"] });
      queryClient.invalidateQueries({ queryKey: ["all-exchanges"] });
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      queryClient.invalidateQueries({ queryKey: ["exchange-detail", id] });
      toast.success("Exchange approved — inventory updated");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to approve exchange");
    },
  });
};

export const useRejectExchange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => rejectExchange(id, reason),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["pending-exchanges"] });
      queryClient.invalidateQueries({ queryKey: ["all-exchanges"] });
      queryClient.invalidateQueries({ queryKey: ["exchange-detail", vars.id] });
      toast.success("Exchange rejected");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to reject exchange");
    },
  });
};
