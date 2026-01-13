import { fetchCategories } from "../services/categories.service";
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
