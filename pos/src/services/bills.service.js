import api from "@/api";
import normalizeError from "@/utils/errorFormatter";

const BASE_PATH = "/bills";

export const BillsService = {
  // GET /bills
  async list(params = {}, signal) {
    try {
      const { data } = await api.get(BASE_PATH, { params, signal });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error fetching bills.");
    }
  },

  // GET /bills/:id
  async getById(billId, signal) {
    try {
      const { data } = await api.get(`${BASE_PATH}/${billId}`, { signal });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error fetching bill details.");
    }
  },

  // POST /bills
  async create(payload, signal) {
    try {
      const { data } = await api.post(BASE_PATH, payload, { signal });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error creating bill.");
    }
  },

  async updateStatus(billId, payload, signal) {
    try {
      const { data } = await api.patch(
        `${BASE_PATH}/${billId}/status`,
        payload,
        { signal }
      );
      return data;
    } catch (error) {
      throw normalizeError(error, "Error updating bill status.");
    }
  },

  async void(billId, signal) {
    try {
      const { data } = await api.delete(`${BASE_PATH}/${billId}`, { signal });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error voiding bill.");
    }
  },

  // GET /bills/my-stats
  async getMyStats(period = "month", signal) {
    try {
      const { data } = await api.get(`${BASE_PATH}/my-stats`, { 
        params: { period },
        signal 
      });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error fetching bill stats.");
    }
  },

  // POST /bills/:id/rounds
  async addRound(billId, payload, signal) {
    try {
      const { data } = await api.post(`${BASE_PATH}/${billId}/rounds`, payload, { signal });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error adding bill round.");
    }
  },

  // POST /bills/:id/pay
  async pay(billId, payload, signal) {
    try {
      const { data } = await api.post(`${BASE_PATH}/${billId}/pay`, payload, { signal });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error processing payment.");
    }
  },
};
