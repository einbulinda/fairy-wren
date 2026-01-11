import { openDB } from "idb";

export const dbPromise = openDB("fairy-wren-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("products")) {
      db.createObjectStore("products", { keyPath: "id" });
    }

    if (!db.objectStoreNames.contains("categories")) {
      db.createObjectStore("categories", { keyPath: "id" });
    }
  },
});
