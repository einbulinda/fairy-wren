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
        `Error fetching details for product ${productId}`
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

  // Upload Product Image
  uploadProductImage: async (formData) => {
    try {
      const response = await api.post("/products/upload-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw normalizeError(error, "Error uploading product image");
    }
  },

  // Delete Product Image
  deleteProductImage: async (imageUrl) => {
    try {
      const response = await api.delete("/products/delete-image", {
        data: { imageUrl },
      });
      return response.data;
    } catch (error) {
      throw normalizeError(error, "Error deleting product image");
    }
  },

  // Update Product Details
  updateProduct: async (productId, payload) => {
    try {
      console.log("Updating Product", payload);
      const updatedProduct = await api.put(`products/${productId}`, payload);
      return updatedProduct.data;
    } catch (error) {
      throw normalizeError(
        error,
        `Error encountered in updating product ${productId}`
      );
    }
  },

  // Deactivate Product
  deactivateProduct: async (productId, payload) => {
    try {
      const response = await api.patch(`/products/${productId}/status`, {
        data: payload,
      });
      return response.data;
    } catch (error) {
      throw normalizeError(
        error,
        `Error encountered in deactivating product ${productId}`
      );
    }
  },

  // Update Inventory Levels
  updateQuantities: async (productId, payload) => {
    try {
      const updatedProduct = await api.patch(
        `/products/${productId}/stock`,
        payload
      );
      return updatedProduct.data;
    } catch (error) {
      throw normalizeError(
        error,
        `Error encountered in updating product ${productId}`
      );
    }
  },

  // Increment Stock Levels
  incrementStock: async (productId, payload) => {
    try {
      console.log("Adding stock for", productId, payload);
      const response = await api.patch(
        `/products/${productId}/add-stock`,
        payload
      );
      console.log("Response received", response);
      return response.data;
    } catch (error) {
      throw normalizeError(
        error,
        `Error encountered in adding stock for: ${productId}`
      );
    }
  },

  // Take Stock Take
  createStockTake: async (payload) => {
    try {
      const response = await api.put("/products/stock-take", payload);
      return response.data;
    } catch (error) {
      throw normalizeError(
        error,
        "Error encountered in recording the stock take"
      );
    }
  },
};

export default productsAPI;
