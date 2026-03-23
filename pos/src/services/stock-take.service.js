import api from "@/api";
import normalizeError from "@/utils/errorFormatter";

export const StockTakeService = {
  async createStockTake({ items }) {
    try {
      // Create a stock take session first
      const { data: session } = await api.post("/inventory/stock-take-sessions", {
        notes: "Physical count",
      });

      // Add items to the session
      await api.post(`/inventory/stock-take-sessions/${session.data.id}/items`, {
        items: items.map((item) => ({
          product_id: item.product_id,
          counted_quantity: item.counted_quantity,
          expected_quantity: item.expected_quantity,
          reason: item.reason || "Physical count",
        })),
      });

      // Complete the session
      const { data: result } = await api.post(
        `/inventory/stock-take-sessions/${session.data.id}/complete`
      );

      return result.data;
    } catch (error) {
      throw normalizeError(error, "Error creating stock take.");
    }
  },

  async getStockTakes(params = {}) {
    try {
      const { data } = await api.get("/inventory/stock-take-sessions", {
        params,
      });
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error fetching stock takes.");
    }
  },

  async getStockTakeById(id) {
    try {
      const { data } = await api.get(`/inventory/stock-take-sessions/${id}`);
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error fetching stock take.");
    }
  },
};
