import api from "@/api";

export const fetchDashboardMetrics = async (startDate, endDate) => {
  const { data } = await api.get("/reports/dashboard", {
    params: { startDate, endDate },
  });
  return data.data;
};

export const fetchPerformanceComparisons = async (startDate, endDate) => {
  const { data } = await api.get("/reports/performance-comparisons", {
    params: { startDate, endDate },
  });
  return data.data;
};

export const fetchBalanceSheet = async (asOfDate) => {
  const { data } = await api.get("/reports/balance-sheet", {
    params: { asOfDate },
  });
  return data.data;
};

export const fetchIncomeStatement = async (startDate, endDate) => {
  const { data } = await api.get("/reports/income-statement", {
    params: { startDate, endDate },
  });
  return data.data;
};

export const fetchTrialBalance = async (startDate, endDate) => {
  const { data } = await api.get("/reports/trial-balance", {
    params: { startDate, endDate },
  });
  return data.data;
};

export const fetchCashFlowStatement = async (startDate, endDate) => {
  const { data } = await api.get("/reports/cash-flow", {
    params: { startDate, endDate },
  });
  return data.data;
};

export const fetchEquityChanges = async (startDate, endDate) => {
  const { data } = await api.get("/reports/equity-changes", {
    params: { startDate, endDate },
  });
  return data.data;
};