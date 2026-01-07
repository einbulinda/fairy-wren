import { useState, useEffect } from "react";
import {
  fetchTotalRevenue,
  fetchDailyRevenue,
  fetchPaymentTypeSummary,
  fetchAverageBillValue,
  fetchOutstandingBills,
  fetchCategorySales,
} from "../services/reports.service";

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
    if (!startDate || !endDate) return;

    const loadReports = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [
          totalRevenue,
          dailyRevenue,
          paymentTypes,
          averageBillValue,
          outstandingBills,
          categorySales,
        ] = await Promise.all([
          fetchTotalRevenue(startDate, endDate),
          fetchDailyRevenue(startDate, endDate),
          fetchPaymentTypeSummary(startDate, endDate),
          fetchAverageBillValue(startDate, endDate),
          fetchOutstandingBills(startDate, endDate),
          fetchCategorySales(startDate, endDate),
        ]);

        setData({
          totalRevenue: totalRevenue.totalRevenue || 0,
          dailyRevenue,
          paymentTypes,
          averageBillValue: averageBillValue.averageBillValue || 0,
          outstandingBills,
          categorySales,
        });
      } catch (err) {
        setError(err?.response?.data?.error || err.message);
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
