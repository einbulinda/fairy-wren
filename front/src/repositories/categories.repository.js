import api from "../services/api";
import {
  saveCategories,
  getOfflineCategories,
} from "../offline/categories.store";

export async function fetchCategories() {
  try {
    const response = await api.get("/categories");

    await saveCategories(response.data);
    return response.data;
  } catch {
    return await getOfflineCategories();
  }
}
