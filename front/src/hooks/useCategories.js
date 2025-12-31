import { useState, useCallback, useEffect } from "react";
import {
  createCategory,
  fetchProducts,
  fetchCategory,
  updateCategory,
  toggleStatus,
} from "../services/categories.service";

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

  // Get A Category
  const fetchCategoryById = useCallback(async (categoryId) => {
    setIsLoading(true);
    setError(null);

    try {
      const category = await fetchCategory(categoryId);
      return category;
    } catch (error) {
      setError(error.message || "Failed to fetch category");
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

  // Update a category
  const updateCategoryDtls = useCallback(async (categoryId, payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedCategory = await updateCategory(categoryId, payload);

      setCategories((prev) =>
        prev.map((category) =>
          category.id === categoryId ? updatedCategory : category
        )
      );
      return updatedCategory;
    } catch (error) {
      setError(error.message || "Failed to update category");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update a category status
  const statusUpdate = useCallback(async (categoryId, payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedStatus = await toggleStatus(categoryId, payload);

      setCategories((prev) =>
        prev.map((category) =>
          category.id === categoryId ? updatedStatus : category
        )
      );
      return updatedStatus;
    } catch (error) {
      setError(error.message || "Failed to update category");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    categories,
    isLoading,
    error,
    reload: loadCategories,
    saveCategory,
    fetchCategoryById,
    updateCategoryDtls,
    statusUpdate,
  };
};
