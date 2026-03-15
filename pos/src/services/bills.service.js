import api from "@/api";
import normalizeError from "@/utils/errorFormatter";

const BASE_PATH = "/bills";

export const BillsService = {
  // GET /bills
  async list(params = {}) {
    try {
      const { data } = await api.get(BASE_PATH, { params });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error fetching bills.");
    }
  },

  // GET /bills/:id
  async getById(billId) {
    try {
      const { data } = await api.get(`${BASE_PATH}/${billId}`);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error fetching bill details.");
    }
  },

  // POST /bills
  async create(payload) {
    try {
      const { data } = await api.post(BASE_PATH, payload);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error creating bill.");
    }
  },
  async updateStatus(billId, payload) {
    try {
      const { data } = await api.patch(
        `${BASE_PATH}/${billId}/status`,
        payload,
      );
      return data;
    } catch (error) {
      throw normalizeError(error, "Error updating bill status.");
    }
  },
  async void(billId) {
    try {
      const { data } = await api.delete(`${BASE_PATH}/${billId}`);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error voiding bill.");
    }
  },
  // GET /bills/my-stats
  async getMyStats(period = "month") {
    try {
      const { data } = await api.get(`${BASE_PATH}/my-stats`, { params: { period } });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error fetching bill stats.");
    }
  },

  // POST /bills/:id/rounds
  async addRound(billId, payload) {
    try {
      const { data } = await api.post(`${BASE_PATH}/${billId}/rounds`, payload);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error adding bill round.");
    }
  },
};
