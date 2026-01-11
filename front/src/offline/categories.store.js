import { dbPromise } from "./db";

export async function saveCategories(categories) {
  const db = await dbPromise;
  const tx = db.transaction("categories", "readwrite");
  categories.forEach((c) => tx.store.put(c));
  await tx.done;
}

export async function getOfflineCategories() {
  const db = await dbPromise;
  return db.getAll("categories");
}
