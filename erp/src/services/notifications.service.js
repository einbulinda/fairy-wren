import api from "@/api";

export const fetchViewedIds = async () => {
  const { data } = await api.get("/notifications/viewed-ids");
  return data;
};

export const markNotificationsViewed = async (items) => {
  const { data } = await api.post("/notifications/mark-viewed", { items });
  return data;
};
