import api from "@/api";
import normalizeError from "@/utils/errorFormatter";

export const ReportsService = {
  async getZReport(date) {
    try {
      const { data } = await api.get("/reports/z-report", { params: { date } });
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error fetching Z-Report.");
    }
  },

  async generateZReport(date) {
    try {
      const { data } = await api.post("/reports/z-report/generate", { date });
      return data.data;
    } catch (error) {
      throw normalizeError(error, "Error generating Z-Report.");
    }
  },
};
