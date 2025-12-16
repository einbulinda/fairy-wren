import { useCallback, useState } from "react";
import {
  fetchProducts,
  createProduct,
  updateQuantities,
} from "../services/products.service";

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all products
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message || "Failed to load products.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new product
  const addProduct = useCallback(async (payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const newProduct = await createProduct(payload);
      setProducts((prev) => [newProduct, ...prev]);
      return newProduct;
    } catch (err) {
      setError(err.message || "Failed to save product details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update Stock for Products
  const updateStocks = useCallback(async (productId, payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedProduct = await updateQuantities(productId, payload);

      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId ? updatedProduct : product
        )
      );
      return updatedProduct;
    } catch (err) {
      setError(err.message || "Failed to update product inventories");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    products,
    isLoading,
    error,

    reload: loadProducts,
    addProduct,
    updateStocks,
  };
};
