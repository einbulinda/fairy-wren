import api from "@/api";
import normalizeError from "@/utils/errorFormatter";

const BASE_PATH = "/mpesa";

/** Human message from a normalized API error, including the server's detail line. */
export const mpesaErrorMessage = (err, fallback = "M-Pesa request failed") => {
  const message = err?.error?.message || err?.message || fallback;
  const detail = err?.error?.details?.[0];
  return detail ? `${message} (${detail})` : message;
};

export const MpesaService = {
  // GET /mpesa/transactions  (status: open|unallocated|partially_allocated|allocated|all, billId, q, from, to)
  async list(params = {}, config = {}) {
    try {
      const { data } = await api.get(`${BASE_PATH}/transactions`, { params, ...config });
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error fetching M-Pesa payments.");
    }
  },

  // GET /mpesa/transactions/:id
  async get(id) {
    try {
      const { data } = await api.get(`${BASE_PATH}/transactions/${id}`);
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error fetching M-Pesa payment.");
    }
  },

  // GET /mpesa/transactions/:id/suggestions
  async suggestions(id) {
    try {
      const { data } = await api.get(`${BASE_PATH}/transactions/${id}/suggestions`);
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error fetching bill suggestions.");
    }
  },

  /**
   * POST /mpesa/transactions/:id/allocate
   * @param {string} id
   * @param {{ lines: {type:"bill"|"tip", billId?:string, amount:number}[], depositLabel?: string }} payload
   */
  async allocate(id, payload) {
    try {
      const { data } = await api.post(`${BASE_PATH}/transactions/${id}/allocate`, payload);
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error matching M-Pesa payment.");
    }
  },

  // GET /mpesa/staff → [{ id, name, role }] (who a tip can be given to)
  async staff() {
    try {
      const { data } = await api.get(`${BASE_PATH}/staff`);
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error fetching staff.");
    }
  },

  // POST /mpesa/allocations/:id/reverse
  async reverse(allocationId, reason) {
    try {
      const { data } = await api.post(`${BASE_PATH}/allocations/${allocationId}/reverse`, { reason });
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error reversing M-Pesa allocation.");
    }
  },
};
