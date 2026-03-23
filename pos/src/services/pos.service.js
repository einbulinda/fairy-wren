import api from "@/api";
import normalizeError from "@/utils/errorFormatter";

export const PosService = {
  async getCurrentReport() {
    try {
      const { data } = await api.get("/pos/current-report");
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error fetching current report.");
    }
  },

  async generateZReport() {
    try {
      const { data } = await api.post("/pos/z-report");
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error generating Z-Report.");
    }
  },

  async getPendingConfirmations() {
    try {
      const { data } = await api.get("/pos/pending-confirmations");
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error fetching pending confirmations.");
    }
  },

  async confirmPayment(billId) {
    try {
      const { data } = await api.post(`/pos/confirm-payment/${billId}`);
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error confirming payment.");
    }
  },
};
