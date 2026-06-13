import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchViewedIds,
  markNotificationsViewed,
} from "@/services/notifications.service";

export const useViewedNotifications = () => {
  const queryClient = useQueryClient();

  const { data: viewedIds = [] } = useQuery({
    queryKey: ["notification-viewed-ids"],
    queryFn: fetchViewedIds,
    select: (data) => data.viewedIds ?? [],
    staleTime: 5 * 60 * 1000,
  });

  const viewedSet = useMemo(() => new Set(viewedIds), [viewedIds]);

  const markViewed = useCallback(
    (items) => {
      if (!items || items.length === 0) return;
      // Optimistic: merge IDs into cache immediately so the badge clears on open
      queryClient.setQueryData(["notification-viewed-ids"], (old) => ({
        viewedIds: [
          ...(old?.viewedIds ?? []),
          ...items.map((i) => i.entity_id),
        ],
      }));
      // Persist to DB in the background
      markNotificationsViewed(items).catch(() => {
        queryClient.invalidateQueries({
          queryKey: ["notification-viewed-ids"],
        });
      });
    },
    [queryClient],
  );

  const filterUnviewed = useCallback(
    (items) => items.filter((item) => !viewedSet.has(item.id)),
    [viewedSet],
  );

  const countUnviewed = useCallback(
    (items) => filterUnviewed(items).length,
    [filterUnviewed],
  );

  return { markViewed, filterUnviewed, countUnviewed };
};
