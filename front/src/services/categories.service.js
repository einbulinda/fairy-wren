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

// Create a category
export const createCategory = async (payload) => {
  try {
    const response = await api.post("/", { payload });
    return response.data;
  } catch (error) {
    throw normalizeError(error, "Error creating a new category.");
  }
};
