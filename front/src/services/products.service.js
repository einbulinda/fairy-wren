import normalizeError from "../utils/errorFormatter";
import api from "./api";

// Fetch Products
export const fetchProducts = async () => {
  try {
    const response = await api.get("/products");
    return response.data;
  } catch (error) {
    throw normalizeError(error, "Error fetching products list");
  }
};

// Create Products
export const createProduct = async (payload) => {
  try {
    const response = await api.post("/products", { payload });
    return response.data;
  } catch (error) {
    throw normalizeError(error, "Error creating new product");
  }
};

// Update Inventory Levels
export const updateQuantities = async (productId, payload) => {
  try {
    const updatedProduct = await api.patch(`/${productId}/stock`, payload);
    return updatedProduct.data;
  } catch (error) {
    throw normalizeError(
      error,
      `Error encountered in updating product ${productId}`
    );
  }
};
