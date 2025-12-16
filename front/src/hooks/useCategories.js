import { useState, useCallback } from "react";
import { createCategory, fetchProducts } from "../services/categories.service";

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load categories
  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchProducts();
      setCategories(data);
    } catch (err) {
      setError(err.message || "Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a category
  const saveCategory = useCallback(async (payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const newCategory = await createCategory(payload);
      setCategories((prev) => [newCategory, ...prev]);
      return newCategory;
    } catch (err) {
      setError(err.message || "Failed to save new category");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { categories, isLoading, error, reload: loadCategories, saveCategory };
};
