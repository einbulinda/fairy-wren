import { useQuery } from "@tanstack/react-query";
import { fetchBalanceSheet } from "@/services/reports.service";

export const useBalanceSheet = (asOfDate) => {
  return useQuery({
    queryKey: ["balance-sheet", asOfDate],
    queryFn: () => fetchBalanceSheet(asOfDate),
    enabled: !!asOfDate,
    staleTime: 2 * 60 * 1000,
  });
};
