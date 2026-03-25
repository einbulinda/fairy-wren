import { useState, useEffect, useCallback } from "react";
import { BillsService } from "@/services/bills.service";

export const useMyBillStats = () => {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const stats = await BillsService.getMyStats(period);
      setStats(stats);
    } catch {
      console.error("Failed to fetch bill stats");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, period, setPeriod, refetch: fetchStats };
};
