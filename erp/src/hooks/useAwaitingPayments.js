import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchBills } from "@/services/bills.service";

export const useAwaitingPayments = () => {
  const { user } = useAuth();
  const canApprove = user?.permissions?.includes("approve_payments");

  const { data, isLoading } = useQuery({
    queryKey: ["bills", "awaiting_confirmation"],
    queryFn: () => fetchBills({ status: "awaiting_confirmation", limit: 50 }),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    enabled: !!canApprove,
  });

  const bills = data?.bills ?? [];

  return { awaitingPayments: bills, count: bills.length, canApprove, isLoading };
};
