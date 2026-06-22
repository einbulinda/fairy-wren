import { useQuery } from "@tanstack/react-query";
import api from "@/api";

const fetchReorderAlerts = async () => {
  const { data } = await api.get("/inventory/reorder-alerts");
  return data ?? [];
};

export const useLowStockAlerts = () => {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["inventory", "reorder-alerts"],
    queryFn: fetchReorderAlerts,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return { lowStockAlerts: alerts, count: alerts.length, isLoading };
};
