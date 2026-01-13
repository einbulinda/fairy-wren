import { fetchCategories, fetchCategory } from "../services/categories.service";
import {
  saveCategories,
  getOfflineCategories,
} from "../offline/categories.store";

export async function getAllCategories() {
  try {
    const response = await fetchCategories();

    await saveCategories(response.data);
    return response.data;
  } catch {
    return await getOfflineCategories();
  }
}

export async function getCategoryById(categoryId) {
  try {
    return await fetchCategory(categoryId);
  } catch {
    const category = await getOfflineCategories();
    return category.find((c) => c.id === categoryId);
  }
}
