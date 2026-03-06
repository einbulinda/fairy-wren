import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchStockTakeReports } from "@/services/inventory.service";

export const usePendingApprovals = () => {
  const { data: all = [], isLoading } = useQuery({
    queryKey: ["stock-take-reports"],
    queryFn: () => fetchStockTakeReports(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const pending = useMemo(
    () =>
      (all || []).filter(
        (r) =>
          r.approval_status === "pending" ||
          r.approval_status === "under_review",
      ),
    [all],
  );

  return { pendingApprovals: pending, count: pending.length, isLoading };
};
