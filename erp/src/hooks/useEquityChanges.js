import { useQuery } from "@tanstack/react-query";
import { fetchEquityChanges } from "@/services/reports.service";

export const useEquityChanges = (startDate, endDate) => {
  return useQuery({
    queryKey: ["equity-changes", startDate, endDate],
    queryFn: () => fetchEquityChanges(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
  });
};
