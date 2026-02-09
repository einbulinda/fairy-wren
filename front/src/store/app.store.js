import { create } from "zustand";

export const useAppStore = create((set) => ({
  categories: [],
  productCatalog: [],

  productCatalogLoaded: false,
  categoriesLoaded: false,

  setCategories: (categories) => set({ categories, categoriesLoaded: true }),
  setProductCatalog: (products) =>
    set({ productCatalog: products, productCatalogLoaded: true }),
}));
