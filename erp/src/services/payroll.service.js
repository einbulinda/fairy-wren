import api from "@/api";

export const fetchPayrollEmployees = async () => {
  const { data } = await api.get("/payroll/employees");
  return data.data ?? data;
};

export const upsertSalaryStructure = async ({ id, ...payload }) => {
  const { data } = await api.put(`/payroll/employees/${id}`, payload);
  return data.data ?? data;
};

export const fetchPayrollRuns = async () => {
  const { data } = await api.get("/payroll/runs");
  return data.data ?? data;
};

export const processPayrollRun = async (payload) => {
  const { data } = await api.post("/payroll/runs", payload);
  return data.data ?? data;
};

export const fetchPayrollRunDetail = async (id) => {
  const { data } = await api.get(`/payroll/runs/${id}`);
  return data.data ?? data;
};

export const markRunPaid = async (id) => {
  const { data } = await api.post(`/payroll/runs/${id}/pay`);
  return data.data ?? data;
};
