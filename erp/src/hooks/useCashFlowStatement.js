import { useQuery } from "@tanstack/react-query";
import { fetchCashFlowStatement } from "@/services/reports.service";

export const useCashFlowStatement = (startDate, endDate) => {
  return useQuery({
    queryKey: ["cash-flow-statement", startDate, endDate],
    queryFn: () => fetchCashFlowStatement(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
  });
};
