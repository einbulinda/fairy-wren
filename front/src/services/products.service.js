import normalizeError from "../utils/errorFormatter";
import api from "./api";

const productsAPI = {
  // Fetch Products
  products: async () => {
    try {
      const response = await api.get("/products");
      return response.data;
    } catch (error) {
      throw normalizeError(error, "Error fetching products list");
    }
  },

  // Fetch Single Product
  product: async (productId) => {
    try {
      const response = await api.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      throw normalizeError(
        error,
        `Error fetching details for product ${productId}`,
      );
    }
  },

  // Create Products
  createProduct: async (payload) => {
    try {
      const response = await api.post("/products", { payload });
      return response.data;
    } catch (error) {
      throw normalizeError(error, "Error creating new product");
    }
  },

  // Update Product Details
  updateProduct: async (productId, payload) => {
    try {
      const updatedProduct = await api.put(`products/${productId}`, payload);
      return updatedProduct.data;
    } catch (error) {
      throw normalizeError(
        error,
        `Error encountered in updating product ${productId}`,
      );
    }
  },

  // Update Status of product
  productStatus: async (productId, payload) => {
    try {
      const response = await api.patch(
        `/products/${productId}/status`,
        payload,
      );
      return response;
    } catch (error) {
      throw normalizeError(
        error,
        `Error encountered in updating product ${productId}`,
      );
    }
  },

  // Deactivate Product
  deactivateProduct: async (productId) => {
    try {
      const response = await api.delete(`/products/${productId}`);
      return response.data;
    } catch (error) {
      throw normalizeError(
        error,
        `Error encountered in deactivating product ${productId}`,
      );
    }
  },
};

export default productsAPI;
