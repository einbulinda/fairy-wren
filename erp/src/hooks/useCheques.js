import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCheques, createCheque, clearCheque, voidCheque } from "@/services/cheques.service";
import toast from "react-hot-toast";

export const useCheques = (params = {}) => {
  return useQuery({
    queryKey: ["cheques", params],
    queryFn: () => fetchCheques(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateCheque = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCheque,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque issued successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to issue cheque");
    },
  });
};

export const useClearCheque = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearCheque,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque marked as cleared");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to clear cheque");
    },
  });
};

export const useVoidCheque = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidCheque,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque voided");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to void cheque");
    },
  });
};
