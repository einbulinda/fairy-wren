import api from "@/api";

export const fetchInbox = async (params = {}) => {
  const { data } = await api.get("/mail/inbox", { params });
  return data.data ?? data;
};

export const fetchMessage = async (uid) => {
  const { data } = await api.get(`/mail/${uid}`);
  return data.data ?? data;
};

export const markRead = async (uid, seen = true) => {
  await api.patch(`/mail/${uid}/read`, { seen });
};

export const deleteMessage = async (uid) => {
  await api.delete(`/mail/${uid}`);
};

export const sendMail = async (payload) => {
  const { data } = await api.post("/mail/send", payload);
  return data.data ?? data;
};
