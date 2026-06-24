import api from "@/api";

export const fetchAuditLogs = async (params = {}) => {
  const { data } = await api.get("/audit", { params });
  return data;
};

export const fetchAuditEntities = async () => {
  const { data } = await api.get("/audit/entities");
  return data.data ?? [];
};
