import api from "@/api";

export const fetchStatements = async (params = {}) => {
  const { data } = await api.get("/bank-reconciliation", { params });
  return data.statements || [];
};

export const fetchStatement = async (id) => {
  const { data } = await api.get(`/bank-reconciliation/${id}`);
  return data.statement;
};

export const importStatement = async (payload) => {
  const { data } = await api.post("/bank-reconciliation/import", payload);
  return data;
};

export const autoMatch = async (id, opts = {}) => {
  const { data } = await api.post(`/bank-reconciliation/${id}/auto-match`, opts);
  return data;
};

export const manualMatch = async (id, lineId, payload) => {
  const { data } = await api.post(`/bank-reconciliation/${id}/lines/${lineId}/match`, payload);
  return data;
};

export const unmatchLine = async (id, lineId) => {
  const { data } = await api.post(`/bank-reconciliation/${id}/lines/${lineId}/unmatch`);
  return data;
};

export const fetchReconciliationReport = async (id) => {
  const { data } = await api.get(`/bank-reconciliation/${id}/report`);
  return data;
};

export const finalizeReconciliation = async (id, payload = {}) => {
  const { data } = await api.post(`/bank-reconciliation/${id}/finalize`, payload);
  return data;
};

export const fetchBankGlDetails = async (accountId, params = {}) => {
  const { data } = await api.get(`/bank-reconciliation/gl/${accountId}`, { params });
  return data.entries || [];
};

export const fetchSuggestedMatches = async (id, lineId) => {
  const { data } = await api.get(`/bank-reconciliation/${id}/lines/${lineId}/suggestions`);
  return data.suggestions || [];
};
