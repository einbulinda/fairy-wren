import { useState, useEffect } from "react";
import { fetchDashboardMetrics } from "../services/reports.service";

/**
 * Custom hook for fetching and managing reports data
 * Uses the optimized /dashboard endpoint for better performance
 *
 * @param {Object} params - Hook parameters
 * @param {string} params.startDate - Start date in YYYY-MM-DD format
 * @param {string} params.endDate - End date in YYYY-MM-DD format
 * @returns {Object} Reports data and loading state
 */
export const useReports = ({ startDate, endDate }) => {
  const [data, setData] = useState({
    totalRevenue: 0,
    dailyRevenue: [],
    paymentTypes: [],
    averageBillValue: 0,
    outstandingBills: [],
    categorySales: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Don't fetch if dates are not provided
    if (!startDate || !endDate) return;

    const loadReports = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use the optimized dashboard endpoint that fetches all metrics in one call
        const metrics = await fetchDashboardMetrics(startDate, endDate);

        setData({
          totalRevenue: metrics.totalRevenue || 0,
          dailyRevenue: metrics.dailyRevenue || [],
          paymentTypes: metrics.paymentTypes || [],
          averageBillValue: metrics.averageBillValue || 0,
          outstandingBills: metrics.outstandingBills || [],
          categorySales: metrics.categorySales || [],
        });
      } catch (err) {
        const errorMessage =
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load reports";
        setError(errorMessage);
        console.error("Reports Hook Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadReports();
  }, [startDate, endDate]);

  return {
    ...data,
    isLoading,
    error,
  };
};
