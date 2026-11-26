import api from "@/api";

/** Readable message from an API error ({ error: { message, details } }). */
export const apiErrorMessage = (err, fallback = "Request failed") => {
  const e = err?.response?.data?.error;
  const msg = e?.message || err?.message || fallback;
  return e?.details?.[0] ? `${msg} (${e.details[0]})` : msg;
};

// GET /mpesa/register?from&to&status&q → { from, to, items, totals, truncated }
export const fetchMpesaRegister = async (params = {}) => {
  const { data } = await api.get("/mpesa/register", { params });
  return data.data;
};

// GET /mpesa/summary → { clearing, tips, payoutAccounts }
export const fetchMpesaSummary = async () => {
  const { data } = await api.get("/mpesa/summary");
  return data.data;
};

// GET /mpesa/transactions?status=open → unmatched payments + deposits
export const fetchMpesaOpen = async (params = {}) => {
  const { data } = await api.get("/mpesa/transactions", { params: { status: "open", limit: 500, ...params } });
  return data.data;
};

// GET /mpesa/transactions/:id → detail with allocations
export const fetchMpesaTransaction = async (id) => {
  const { data } = await api.get(`/mpesa/transactions/${id}`);
  return data.data;
};

// POST /mpesa/allocations/:id/reverse { reason }
export const reverseMpesaAllocation = async ({ allocationId, reason }) => {
  const { data } = await api.post(`/mpesa/allocations/${allocationId}/reverse`, { reason });
  return data.data;
};

// GET /mpesa/tips/payouts?recipientId
export const fetchTipPayouts = async (params = {}) => {
  const { data } = await api.get("/mpesa/tips/payouts", { params });
  return data.data;
};

// POST /mpesa/tips/payouts { recipientId, amount, accountId, notes }
export const payTips = async (payload) => {
  const { data } = await api.post("/mpesa/tips/payouts", payload);
  return data.data;
};
