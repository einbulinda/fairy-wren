import api from "@/api";

export const fetchMailboxes = async () => {
  const { data } = await api.get("/mail/mailboxes");
  return data.data ?? data;
};

export const fetchInbox  = async (params = {}) => { const { data } = await api.get("/mail/inbox",  { params }); return data.data ?? data; };
export const fetchSent   = async (params = {}) => { const { data } = await api.get("/mail/sent",   { params }); return data.data ?? data; };
export const fetchDrafts = async (params = {}) => { const { data } = await api.get("/mail/drafts", { params }); return data.data ?? data; };

export const fetchMessage = async (uid, folder = "INBOX", mailbox = "admin") => {
  const { data } = await api.get(`/mail/${uid}`, { params: { folder, mailbox } });
  return data.data ?? data;
};

export const markRead = async (uid, seen = true, mailbox = "admin") => {
  await api.patch(`/mail/${uid}/read`, { seen, mailbox });
};

export const deleteMessage = async (uid, folder = "INBOX", mailbox = "admin") => {
  await api.delete(`/mail/${uid}`, { params: { folder, mailbox } });
};

export const saveDraft = async (payload) => {
  const { data } = await api.post("/mail/drafts", payload);
  return data.data ?? data;
};

export const sendMail = async ({ to, cc, subject, text, files = [], mailbox = "admin" }) => {
  const fd = new FormData();
  fd.append("to", to);
  fd.append("subject", subject);
  fd.append("text", text || "");
  fd.append("mailbox", mailbox);
  if (cc) fd.append("cc", cc);
  files.forEach((f) => fd.append("attachments", f));
  const { data } = await api.post("/mail/send", fd);
  return data.data ?? data;
};
