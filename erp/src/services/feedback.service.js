import api from "@/api";

export const fetchFeedback = async (params = {}) => {
  const { data } = await api.get("/feedback", { params });
  return data;
};

export const markFeedbackRead = async (id) => {
  const { data } = await api.patch(`/feedback/${id}/read`);
  return data;
};

export const archiveFeedback = async (id) => {
  const { data } = await api.patch(`/feedback/${id}/archive`);
  return data;
};
