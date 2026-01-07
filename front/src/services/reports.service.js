import api from "./api";

export const fetchTotalRevenue = async (startDate, endDate) => {
  const { data } = await api.get("/reports/total-revenue", {
    params: { startDate, endDate },
  });
  return data;
};

export const fetchDailyRevenue = async (startDate, endDate) => {
  const { data } = await api.get("/reports/daily-revenue", {
    params: { startDate, endDate },
  });
  return data;
};

export const fetchPaymentTypeSummary = async (startDate, endDate) => {
  const { data } = await api.get("/reports/payment-types", {
    params: { startDate, endDate },
  });
  return data;
};

export const fetchAverageBillValue = async (startDate, endDate) => {
  const { data } = await api.get("/reports/average-bill-value", {
    params: { startDate, endDate },
  });
  return data;
};

export const fetchOutstandingBills = async (startDate, endDate) => {
  const { data } = await api.get("/reports/outstanding-bills", {
    params: { startDate, endDate },
  });
  return data;
};

export const fetchCategorySales = async (startDate, endDate) => {
  const { data } = await api.get("/reports/category-sales", {
    params: { startDate, endDate },
  });
  return data;
};
