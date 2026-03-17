import { useQuery } from "@tanstack/react-query";
import { fetchZReport } from "@/services/reports.service";

export const useZReport = (date) => {
  return useQuery({
    queryKey: ["z-report", date],
    queryFn: () => fetchZReport(date),
    enabled: !!date,
    staleTime: 2 * 60 * 1000,
  });
};
