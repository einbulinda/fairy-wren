import { useState, useEffect } from "react";
import { fetchPerformanceComparisons } from "../services/reports.service";

/**
 * Custom hook for fetching performance comparison data
 *
 * @param {Object} params - Hook parameters
 * @param {string} params.startDate - Start date in YYYY-MM-DD format
 * @param {string} params.endDate - End date in YYYY-MM-DD format
 * @returns {Object} Performance comparison data and loading state
 */
export const usePerformanceComparisons = ({ startDate, endDate }) => {
  const [data, setData] = useState({
    weeklyPerformance: [],
    monthlyPerformance: [],
    weekendWeekdayPerformance: [],
    dayOfWeekPerformance: [],
    dailyCategoryBreakdown: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Don't fetch if dates are not provided
    if (!startDate || !endDate) return;

    const loadPerformanceData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const comparisons = await fetchPerformanceComparisons(
          startDate,
          endDate
        );

        setData({
          weeklyPerformance: comparisons.weeklyPerformance || [],
          monthlyPerformance: comparisons.monthlyPerformance || [],
          weekendWeekdayPerformance: comparisons.weekendWeekdayPerformance || [],
          dayOfWeekPerformance: comparisons.dayOfWeekPerformance || [],
          dailyCategoryBreakdown: comparisons.dailyCategoryBreakdown || [],
        });
      } catch (err) {
        const errorMessage =
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load performance comparisons";
        setError(errorMessage);
        console.error("Performance Comparisons Hook Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPerformanceData();
  }, [startDate, endDate]);

  return {
    ...data,
    isLoading,
    error,
  };
};
