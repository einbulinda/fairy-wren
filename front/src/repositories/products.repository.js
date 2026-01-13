import productsAPI from "../services/products.service";
import { saveProducts, getOfflineProducts } from "../offline/products.store";

export async function getAllProducts() {
  try {
    const products = await productsAPI.products();

    await saveProducts(products);
    return products;
  } catch (error) {
    console.warn("Products API unavailable. Loading offline data.", error);
    return await getOfflineProducts();
  }
}
