import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchReservations } from "@/services/reservations.service";

export const usePendingReservations = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["reservations", "pending"],
    queryFn: () => fetchReservations({ status: "pending", limit: 20 }),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const pending = useMemo(() => data?.reservations ?? [], [data]);

  return { pendingReservations: pending, count: pending.length, isLoading };
};
