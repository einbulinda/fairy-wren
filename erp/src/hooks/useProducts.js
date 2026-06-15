import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchProducts,
  fetchProduct,
  createProduct,
  updateProduct,
  updateProductStatus,
  fetchProductPurchaseHistory,
  fetchProductSalesHistory,
  fetchProductInsights,
  fetchProductStatement,
} from "@/services/products.service";

export const useProducts = (params = {}) => {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => fetchProducts(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useProduct = (id) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
      toast.success("Product created");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create product");
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProduct,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", vars.id] });
      toast.success("Product updated");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update product");
    },
  });
};

export const useUpdateProductStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProductStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Status updated");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update status");
    },
  });
};

export const useProductPurchaseHistory = (id, dateRange = {}) => {
  return useQuery({
    queryKey: ["product-purchases", id, dateRange],
    queryFn: () => fetchProductPurchaseHistory(id, dateRange),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProductSalesHistory = (id, dateRange = {}) => {
  return useQuery({
    queryKey: ["product-sales", id, dateRange],
    queryFn: () => fetchProductSalesHistory(id, dateRange),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProductInsights = (id, dateRange = {}) => {
  return useQuery({
    queryKey: ["product-insights", id, dateRange],
    queryFn: () => fetchProductInsights(id, dateRange),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProductStatement = (id, dateRange = {}) => {
  return useQuery({
    queryKey: ["product-statement", id, dateRange],
    queryFn: () => fetchProductStatement(id, dateRange),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};
