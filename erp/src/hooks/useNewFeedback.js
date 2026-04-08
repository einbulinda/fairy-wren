import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchFeedback } from "@/services/feedback.service";

export const useNewFeedback = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["feedback", "new"],
    queryFn: () => fetchFeedback({ status: "new", limit: 20 }),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const newItems = useMemo(() => data?.feedback ?? [], [data]);

  return { newFeedback: newItems, count: newItems.length, isLoading };
};
