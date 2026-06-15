import { useQuery } from "@tanstack/react-query";
import { fetchBill, fetchBills } from "@/services/bills.service";

export const useBills = (params = {}) => {
  return useQuery({
    queryKey: ["bills", params],
    queryFn: () => fetchBills(params),
    staleTime: 2 * 60 * 1000,
  });
};

export const useBill = (id) => {
  return useQuery({
    queryKey: ["bill", id],
    queryFn: () => fetchBill(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};
