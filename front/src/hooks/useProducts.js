import { useCallback, useEffect, useState } from "react";
import productsAPI from "../services/products.service";

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all products
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await productsAPI.products();
      setProducts(data);
    } catch (err) {
      setError(err.message || "Failed to load products.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch Single Product by ID
  const fetchProductById = useCallback(async (productId) => {
    setIsLoading(true);
    setError(null);
    try {
      const product = await productsAPI.product(productId);
      return product;
    } catch (err) {
      setError(err.message || "Failed to fetch product details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new product
  const addProduct = useCallback(async (payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const newProduct = await productsAPI.createProduct(payload);
      setProducts((prev) => [newProduct, ...prev]);
      return newProduct;
    } catch (err) {
      setError(err.message || "Failed to save product details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update Product Details
  const updateProduct = useCallback(async (productId, payload) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedProduct = await productsAPI.updateProduct(
        productId,
        payload
      );
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId ? updatedProduct : product
        )
      );
      return updatedProduct;
    } catch (err) {
      setError(err.message || "Failed to update product details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Deactivate Product
  const deactivateProduct = useCallback(async (productId) => {
    setIsLoading(true);
    setError(null);
    try {
      await productsAPI.deactivateProduct(productId);
      setProducts((prev) => prev.filter((product) => product.id !== productId));
    } catch (err) {
      setError(err.message || "Failed to deactivate product");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upload Product Image
  const uploadProductImage = useCallback(async (formData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await productsAPI.uploadProductImage(formData);
      return response;
    } catch (err) {
      setError(err.message || "Failed to upload product image");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete Product Image
  const deleteProductImage = useCallback(async (imageUrl) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await productsAPI.deleteProductImage(imageUrl);
      return response;
    } catch (err) {
      setError(err.message || "Failed to delete product image");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update Stock for Products
  const updateStocks = useCallback(async (productId, payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedProduct = await productsAPI.updateQuantities(
        productId,
        payload
      );

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

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    products,
    isLoading,
    fetchProductById,
    updateProduct,
    deactivateProduct,
    uploadProductImage,
    deleteProductImage,
    error,
    reload: loadProducts,
    addProduct,
    updateStocks,
  };
};
