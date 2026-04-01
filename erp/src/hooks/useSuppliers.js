import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchSuppliers,
  fetchSupplier,
  fetchSupplierBalances,
  createSupplier,
  updateSupplier,
  fetchSupplierPurchases,
  fetchSupplierPayments,
  createSupplierPayment,
  fetchSupplierStatement,
  fetchPendingInvoices,
  fetchUnpaidInvoices,
} from "@/services/suppliers.service";

export const useSuppliers = (params = {}) => {
  return useQuery({
    queryKey: ["suppliers", params],
    queryFn: () => fetchSuppliers(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSupplierBalances = () => {
  return useQuery({
    queryKey: ["supplier-balances"],
    queryFn: fetchSupplierBalances,
    staleTime: 2 * 60 * 1000,
  });
};

export const useSupplier = (id) => {
  return useQuery({
    queryKey: ["supplier", id],
    queryFn: () => fetchSupplier(id),
    enabled: !!id,
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier created");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create supplier");
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSupplier,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier", vars.id] });
      toast.success("Supplier updated");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update supplier");
    },
  });
};

export const useSupplierPurchases = (id) => {
  return useQuery({
    queryKey: ["supplier-purchases", id],
    queryFn: () => fetchSupplierPurchases(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useSupplierPayments = (id) => {
  return useQuery({
    queryKey: ["supplier-payments", id],
    queryFn: () => fetchSupplierPayments(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useUnpaidInvoices = (supplierId) => {
  return useQuery({
    queryKey: ["supplier-unpaid-invoices", supplierId],
    queryFn: () => fetchUnpaidInvoices(supplierId),
    enabled: !!supplierId,
    staleTime: 60 * 1000,
  });
};

export const useCreateSupplierPayment = (supplierId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createSupplierPayment({ supplierId, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-payments", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["supplier-statement", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["supplier-unpaid-invoices", supplierId] });
      queryClient.invalidateQueries({ queryKey: ["supplier-purchases", supplierId] });
      toast.success("Payment recorded");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to record payment");
    },
  });
};

export const useSupplierStatement = (id, from, to) => {
  return useQuery({
    queryKey: ["supplier-statement", id, from, to],
    queryFn: () => fetchSupplierStatement(id, from, to),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const usePendingInvoices = () => {
  return useQuery({
    queryKey: ["pending-invoices"],
    queryFn: fetchPendingInvoices,
    staleTime: 2 * 60 * 1000,
  });
};
