import { create } from "zustand";

export const useAppStore = create((set, get) => ({
  // Categories and Products
  categories: [],
  productCatalog: [],
  productCatalogLoaded: false,
  categoriesLoaded: false,

  setCategories: (categories) => set({ categories, categoriesLoaded: true }),
  setProductCatalog: (products) =>
    set({ productCatalog: products, productCatalogLoaded: true }),

  // Bills - shared state for real-time sync
  bills: [],
  billsLoading: false,
  billsError: null,
  billsLastFetched: null,

  setBills: (bills) => set({ bills: Array.isArray(bills) ? bills : [], billsLastFetched: Date.now() }),
  setBillsLoading: (loading) => set({ billsLoading: loading }),
  setBillsError: (error) => set({ billsError: error }),
  
  // Action to trigger bills reload - will be used by components
  billsReloadTrigger: 0,
  triggerBillsReload: () => set((state) => ({ billsReloadTrigger: state.billsReloadTrigger + 1 })),
}));
