import api from "@/api";

export const inventoryService = {
  getStock: () => api.get("/inventory/items").then((res) => res.data),

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

  getStockTakeDetail: (id) =>
    api.get(`/inventory/reports/stock-take/${id}`).then((res) => res.data),

  createStockTakeSession: (payload) =>
    api
      .post("/inventory/stock-take-sessions", payload)
      .then((res) => res.data.data),

  recordStockTakeItem: (id, payload) =>
    api
      .post(`/inventory/stock-take-sessions/${id}/items`, payload)
      .then((res) => res.data.data),

  completeStockTake: (currentSessionId) =>
    api
      .post(`/inventory/stock-take-sessions/${currentSessionId}/complete`)
      .then((res) => res.data.data),
  getIncompleteStockTakes: () =>
    api
      .get("/inventory/stock-take-sessions/incomplete")
      .then((res) => res.data.data),
  getStockTakeItems: (sessionId) =>
    api
      .get(`/inventory/stock-take-sessions/${sessionId}/items`)
      .then((res) => res.data.data),

  approveStockTake: (stockTakeId, payload) =>
    api
      .post(`/inventory/stock-take-sessions/${stockTakeId}/approve`, payload)
      .then((res) => res.data),

  rejectStockTake: (stockTakeId, payload) =>
    api
      .post(`/inventory/stock-take-sessions/${stockTakeId}/reject`, payload)
      .then((res) => res.data),
};
