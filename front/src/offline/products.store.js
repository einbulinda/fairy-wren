import { dbPromise } from "./db";

export async function saveProducts(products) {
  const db = await dbPromise;
  const tx = db.transaction("products", "readwrite");
  products.forEach((p) => tx.store.put(p));
  await tx.done;
}

export async function getOfflineProducts() {
  const db = await dbPromise;
  return db.getAll("products");
}
