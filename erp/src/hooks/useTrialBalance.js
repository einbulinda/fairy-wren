import { useQuery } from "@tanstack/react-query";
import { fetchTrialBalance } from "@/services/reports.service";

export const useTrialBalance = (startDate, endDate) => {
  return useQuery({
    queryKey: ["trial-balance", startDate, endDate],
    queryFn: () => fetchTrialBalance(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
  });
};
