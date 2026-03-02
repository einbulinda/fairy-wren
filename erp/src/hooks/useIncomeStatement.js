import { useQuery } from "@tanstack/react-query";
import { fetchIncomeStatement } from "@/services/reports.service";

export const useIncomeStatement = (startDate, endDate) => {
  return useQuery({
    queryKey: ["income-statement", startDate, endDate],
    queryFn: () => fetchIncomeStatement(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000,
  });
};
