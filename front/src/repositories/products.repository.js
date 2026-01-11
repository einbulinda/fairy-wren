import {}

import { saveProducts, getOfflineProducts } from "../offline/products.store";

export async function fetchProducts() {
  try {
    const response = await api.get("/products");

    await saveProducts(response.data);
    return response.data;
  } catch (error) {
    console.warn("Products API unavailable. Loading offline data.", error);
    return await getOfflineProducts();
  }
}
