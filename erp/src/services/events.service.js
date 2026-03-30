import api from "@/api";

export const fetchEvents = async (params = {}) => {
  const { data } = await api.get("/events", { params });
  return data;
};

export const createEvent = async (payload) => {
  const { data } = await api.post("/events", payload);
  return data;
};

export const updateEvent = async (id, payload) => {
  const { data } = await api.patch(`/events/${id}`, payload);
  return data;
};

export const deleteEvent = async (id) => {
  await api.delete(`/events/${id}`);
};

export const uploadEventPoster = async (id, file) => {
  const formData = new FormData();
  formData.append("poster", file);
  const { data } = await api.post(`/events/${id}/poster`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};
