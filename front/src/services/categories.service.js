import api from "@/api";
import normalizeError from "@/utils/errorFormatter";

const BASE_PATH = "/categories";

export const CategoriesService = {
  async list() {
    try {
      const { data } = await api.get(BASE_PATH);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error Fetching Categories");
    }
  },

  async getById(id) {
    try {
      const { data } = api.get(`${BASE_PATH}/${id}`);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error Fetching Category Details");
    }
  },

  async create(payload) {
    try {
      const { data } = api.post(BASE_PATH, payload);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error Creating Category");
    }
  },

  async update(id, payload) {
    try {
      const { data } = await api.patch(`${BASE_PATH}/${id}`, payload);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error Updating Selected Category.");
    }
  },

  async toggleStatus(categoryId, params = {}) {
    try {
      const { data } = await api.delete(`${BASE_PATH}/${categoryId}`, {
        params,
      });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error Updating Category Status.");
    }
  },
};
