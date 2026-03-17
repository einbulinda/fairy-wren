import { useState, useEffect, useCallback } from "react";
import { ReportsService } from "@/services/reports.service";

export const useZReport = (date) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const result = await ReportsService.getZReport(date);
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load Z-Report");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { data, loading, error, refetch: fetchReport };
};
