import api from "@/api";
import normalizeError from "@/utils/errorFormatter";

const BASE_PATH = "/payments";

export const PaymentService = {
  // GET /payments
  async list(params = {}) {
    try {
      const { data } = await api.get(BASE_PATH, { params });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error fetching payments.");
    }
  },

  // POST /payments
  async process(payload) {
    try {
      const { data } = await api.post(BASE_PATH, payload);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error processing payment.");
    }
  },

  // GET /payments/bills
  async listBillsWithPayments(params = {}) {
    try {
      const { data } = await api.get(`${BASE_PATH}/bills`, { params });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error fetching bills with payments.");
    }
  },
};
