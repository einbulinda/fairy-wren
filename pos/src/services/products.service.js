import api from "@/api";
import normalizeError from "@/utils/errorFormatter";

const BASE_PATH = "/products";

export const ProductsService = {
  async list(params = {}) {
    try {
      const { data } = await api.get(BASE_PATH, { params });
      return data;
    } catch (error) {
      throw normalizeError(error, "Error fetching products.");
    }
  },

  async getById(productId) {
    try {
      const { data } = await api.get(`${BASE_PATH}/${productId}`);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error fetching product details.");
    }
  },

  async create(payload) {
    try {
      const { data } = await api.post(BASE_PATH, payload);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error creating product.");
    }
  },

  async update(productId, payload) {
    try {
      const { data } = await api.patch(`${BASE_PATH}/${productId}`, payload);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error updating product.");
    }
  },

  async toggleStatus(productId, payload) {
    try {
      const { data } = await api.patch(
        `${BASE_PATH}/${productId}/status`,
        payload,
      );
      return data;
    } catch (error) {
      throw normalizeError(error, "Error updating selected product status");
    }
  },

  async delete(productId) {
    try {
      const { data } = api.delete(`${BASE_PATH}/${productId}`);
      return data;
    } catch (error) {
      throw normalizeError(error, "Error archiving selected product.");
    }
  },
};
