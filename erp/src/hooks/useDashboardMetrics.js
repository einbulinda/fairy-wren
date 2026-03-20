import { useQuery } from "@tanstack/react-query";
import { fetchDashboardMetrics } from "@/services/reports.service";
import { fetchStockItems, fetchMovementAnalysis } from "@/services/inventory.service";

// Enhanced hook that combines dashboard metrics with inventory data
export const useDashboardMetrics = ({ startDate, endDate }) => {
  // Fetch main dashboard metrics
  const dashboardQuery = useQuery({
    queryKey: ["dashboard-metrics", startDate, endDate],
    queryFn: () => fetchDashboardMetrics(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch inventory data for stock alerts
  const inventoryQuery = useQuery({
    queryKey: ["stock-items"],
    queryFn: () => fetchStockItems({}),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch product movement analysis (FAST / SLOW / NON_MOVING)
  const movementQuery = useQuery({
    queryKey: ["movement-analysis"],
    queryFn: fetchMovementAnalysis,
    staleTime: 5 * 60 * 1000,
  });

  // Combine the data
  const combinedData = dashboardQuery.data
    ? {
        ...dashboardQuery.data,
        stockItems: inventoryQuery.data || [],
        movementAnalysis: movementQuery.data || [],
      }
    : null;

  return {
    data: combinedData,
    isLoading: dashboardQuery.isLoading || inventoryQuery.isLoading,
    error: dashboardQuery.error || inventoryQuery.error,
    refetch: () => {
      dashboardQuery.refetch();
      inventoryQuery.refetch();
      movementQuery.refetch();
    },
  };
};

export default useDashboardMetrics;
