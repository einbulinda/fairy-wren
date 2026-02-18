import { useQuery } from "@tanstack/react-query";
import { fetchDashboardMetrics } from "@/services/reports.service";

export const useDashboardMetrics = ({ startDate, endDate }) => {
  return useQuery({
    queryKey: ["dashboard-metrics", startDate, endDate],
    queryFn: () => fetchDashboardMetrics(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
};