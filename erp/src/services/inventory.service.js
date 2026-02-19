import api from "@/api";

export const fetchStockItems = async (params = {}) => {
  const { data } = await api.get("/inventory/items", { params });
  return data.data ?? data;
};

export const createInventoryReceipt = async (payload) => {
  const { data } = await api.post("/inventory/receipts", payload);
  return data.data;
};

// Stock-take sessions
export const createStockTakeSession = async () => {
  const { data } = await api.post("/inventory/stock-take-sessions");
  return data.data;
};

export const fetchIncompleteStockTake = async () => {
  const { data } = await api.get("/inventory/stock-take-sessions/incomplete");
  return data.data ?? null;
};

export const recordStockTakeItem = async (sessionId, payload) => {
  const { data } = await api.post(
    `/inventory/stock-take-sessions/${sessionId}/items`,
    payload
  );
  return data.data;
};

export const fetchStockTakeItems = async (sessionId) => {
  const { data } = await api.get(
    `/inventory/stock-take-sessions/${sessionId}/items`
  );
  return data.data ?? data;
};

export const completeStockTakeSession = async (sessionId) => {
  const { data } = await api.post(
    `/inventory/stock-take-sessions/${sessionId}/complete`
  );
  return data.data;
};

export const approveStockTake = async (sessionId) => {
  const { data } = await api.post(
    `/inventory/stock-take-sessions/${sessionId}/approve`
  );
  return data.data;
};

export const rejectStockTake = async (sessionId) => {
  const { data } = await api.post(
    `/inventory/stock-take-sessions/${sessionId}/reject`
  );
  return data.data;
};

// Reports
export const fetchStockTakeReports = async (params = {}) => {
  const { data } = await api.get("/inventory/reports/stock-take", { params });
  return data.data ?? data;
};

export const fetchStockTakeAdjustments = async (params = {}) => {
  const { data } = await api.get("/inventory/stock-take-adjustments", { params });
  return data.data ?? data;
};
