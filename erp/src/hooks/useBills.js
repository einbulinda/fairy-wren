import { useQuery } from "@tanstack/react-query";
import { fetchBills } from "@/services/bills.service";

export const useBills = (params = {}) => {
  return useQuery({
    queryKey: ["bills", params],
    queryFn: () => fetchBills(params),
    staleTime: 2 * 60 * 1000,
  });
};
