import { useQuery } from "@tanstack/react-query";
import { fetchPerformanceComparisons } from "@/services/reports.service";

export const usePerformanceComparisons = ({ startDate, endDate }) => {
  return useQuery({
    queryKey: ["performance-comparisons", startDate, endDate],
    queryFn: () => fetchPerformanceComparisons(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
};