import api from "./api";

export const inventoryService = {
  getStock: () => api.get("/inventory/stock").then((res) => res.data),

  restock: (payload) =>
    api.post("/inventory/restock", payload).then((res) => res.data),

  createStockTake: () =>
    api.post("/inventory/stock-takes").then((res) => res.data),

  addStockTakeItems: (stockTakeId, items) =>
    api
      .post(`/inventory/stock-takes/${stockTakeId}/items`, { items })
      .then((res) => res.data),

  completeStockTake: (stockTakeId) =>
    api
      .post(`/inventory/stock-takes/${stockTakeId}/complete`)
      .then((res) => res.data),

  getLedger: (params) =>
    api.get("/inventory/ledger", { params }).then((res) => res.data),
};
