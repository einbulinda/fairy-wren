import api from "@/api";

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

  getLedger: (params) =>
    api.get("/inventory/ledger", { params }).then((res) => res.data),

  receiveStock: (payload) =>
    api.post("/inventory/receipts", payload).then((res) => res.data),

  stockTakeReports: (params) =>
    api.get("inventory/reports/stock-take", { params }).then((res) => res.data),
  createStockTakeSession: (payload) =>
    api.post("/inventory/stock-take-sessions", payload).then((res) => res.data),
  recordStockTakeItem: (id, payload) =>
    api
      .post(`/inventory/stock-take-sessions/${id}/item`, payload)
      .then((res) => res.data),
  completeStockTake: (currentSessionId) =>
    api
      .post(`/inventory/stock-take-sessions/${currentSessionId}/complete`)
      .then((res) => res.data),
  getIncompleteStockTakes: () =>
    api
      .get("/inventory/stock-take-sessions/incomplete")
      .then((res) => res.data),
  getStockTakeItems: (sessionId) =>
    api
      .get(`/inventory/stock-take-sessions/${sessionId}/items`)
      .then((res) => res.data),
};
