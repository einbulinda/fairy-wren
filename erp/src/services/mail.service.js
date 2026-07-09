import api from "@/api";

export const fetchInbox  = async (params = {}) => { const { data } = await api.get("/mail/inbox",  { params }); return data.data ?? data; };
export const fetchSent   = async (params = {}) => { const { data } = await api.get("/mail/sent",   { params }); return data.data ?? data; };
export const fetchDrafts = async (params = {}) => { const { data } = await api.get("/mail/drafts", { params }); return data.data ?? data; };

export const fetchMessage = async (uid, folder = "INBOX") => {
  const { data } = await api.get(`/mail/${uid}`, { params: { folder } });
  return data.data ?? data;
};

export const markRead = async (uid, seen = true) => { await api.patch(`/mail/${uid}/read`, { seen }); };

export const deleteMessage = async (uid, folder = "INBOX") => {
  await api.delete(`/mail/${uid}`, { params: { folder } });
};

export const saveDraft = async (payload) => {
  const { data } = await api.post("/mail/drafts", payload);
  return data.data ?? data;
};

export const sendMail = async ({ to, cc, subject, text, files = [] }) => {
  const fd = new FormData();
  fd.append("to", to);
  fd.append("subject", subject);
  fd.append("text", text || "");
  if (cc) fd.append("cc", cc);
  files.forEach((f) => fd.append("attachments", f));
  const { data } = await api.post("/mail/send", fd);
  return data.data ?? data;
};
