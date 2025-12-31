import api from "./api";
import normalizeError from "../utils/errorFormatter";

// Fetch Categories
export const fetchProducts = async () => {
  try {
    const response = await api.get("/categories");
    return response.data;
  } catch (error) {
    throw normalizeError(error, "Error fetching categories list.");
  }
};

// Fetch A Category by ID
export const fetchCategory = async (categoryId) => {
  try {
    const response = await api.get(`/categories/${categoryId}`);
    return response.data;
  } catch (error) {
    throw normalizeError(error, "Error getting category selected.");
  }
};

// Create a category
export const createCategory = async (payload) => {
  try {
    console.log("Adding a category ", payload);
    const response = await api.post("/categories", payload);
    return response.data;
  } catch (error) {
    throw normalizeError(error, "Error creating a new category.");
  }
};

// Update Status
export const toggleStatus = async (categoryId, payload) => {
  try {
    const response = await api.patch(
      `/categories/${categoryId}/status-update`,
      payload
    );
    return response.data;
  } catch (error) {
    throw normalizeError(error, "Error updating the selected category.");
  }
};

// Update a category
export const updateCategory = async (categoryId, payload) => {
  try {
    const response = await api.patch(`/categories/${categoryId}`, { payload });
    return response.data;
  } catch (error) {
    throw normalizeError(error, "Error updating the selected category.");
  }
};
