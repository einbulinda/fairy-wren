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

export const approveStockTake = async (sessionId, payload = {}) => {
  const { data } = await api.post(
    `/inventory/stock-take-sessions/${sessionId}/approve`,
    payload,
  );
  return data.data;
};

export const rejectStockTake = async (sessionId, payload = {}) => {
  const { data } = await api.post(
    `/inventory/stock-take-sessions/${sessionId}/reject`,
    payload,
  );
  return data.data;
};

// Receipts
export const fetchReceiptDetail = async (id) => {
  const { data } = await api.get(`/inventory/receipts/${id}`);
  return data.data ?? data;
};

export const markReceiptPaid = async ({ id, ...payload }) => {
  const { data } = await api.post(`/inventory/receipts/${id}/pay`, payload);
  return data.data ?? data;
};

// Reports
export const fetchStockTakeReports = async (params = {}) => {
  const { data } = await api.get("/inventory/reports/stock-take", { params });
  return data.data ?? data;
};

export const fetchStockTakeDetail = async (id) => {
  const { data } = await api.get(`/inventory/reports/stock-take/${id}`);
  return data.data ?? data;
};

export const fetchStockTakeAdjustments = async (params = {}) => {
  const { data } = await api.get("/inventory/stock-take-adjustments", { params });
  return data.data ?? data;
};

// Reorder Level Policies
export const fetchReorderPolicies = async () => {
  const { data } = await api.get("/inventory/reorder-policies");
  return data.data ?? data;
};

export const fetchReorderAlerts = async () => {
  const { data } = await api.get("/inventory/reorder-alerts");
  return data.data ?? data;
};

export const fetchReorderSettings = async () => {
  const { data } = await api.get("/inventory/reorder-settings");
  return data.data ?? data;
};

export const updateReorderSettings = async (payload) => {
  const { data } = await api.patch("/inventory/reorder-settings", payload);
  return data.data ?? data;
};

export const triggerReorderRefresh = async () => {
  const { data } = await api.post("/inventory/reorder-refresh");
  return data.data ?? data;
};

export const setManualReorderLevel = async ({ productId, reorder_level }) => {
  const { data } = await api.post(
    `/inventory/reorder-policies/${productId}/override`,
    { reorder_level },
  );
  return data.data ?? data;
};

export const fetchMovementAnalysis = async () => {
  const { data } = await api.get("/inventory/movement-analysis");
  return data.data ?? data;
};

export const clearReorderOverride = async (productId) => {
  const { data } = await api.delete(
    `/inventory/reorder-policies/${productId}/override`,
  );
  return data.data ?? data;
};

// Product Conversions
export const fetchConvertibleProducts = async () => {
  const { data } = await api.get("/inventory/conversions/products");
  return data.data ?? data;
};

export const fetchConversionHistory = async () => {
  const { data } = await api.get("/inventory/conversions/history");
  return data.data ?? data;
};

export const fetchTotSize = async () => {
  const { data } = await api.get("/inventory/conversions/tot-size");
  return data.data ?? data;
};

export const executeConversion = async (payload) => {
  const { data } = await api.post("/inventory/conversions", payload);
  return data.data ?? data;
};
