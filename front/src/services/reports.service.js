import api from "@/api";

/**
 * Reports Service
 * Handles all API calls for reports and dashboard metrics
 */

/**
 * Fetch all dashboard metrics in a single API call (recommended)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} All dashboard metrics
 */
export const fetchDashboardMetrics = async (startDate, endDate) => {
  const { data } = await api.get("/reports/dashboard", {
    params: { startDate, endDate },
  });
  return data.data; // Extract the data object from the response
};

/**
 * Fetch total revenue for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<number>} Total revenue
 */
export const fetchTotalRevenue = async (startDate, endDate) => {
  const { data } = await api.get("/reports/total-revenue", {
    params: { startDate, endDate },
  });
  return data.data.totalRevenue;
};

/**
 * Fetch daily revenue breakdown for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Daily revenue data
 */
export const fetchDailyRevenue = async (startDate, endDate) => {
  const { data } = await api.get("/reports/daily-revenue", {
    params: { startDate, endDate },
  });
  return data.data;
};

/**
 * Fetch payment type summary for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Payment type summary
 */
export const fetchPaymentTypeSummary = async (startDate, endDate) => {
  const { data } = await api.get("/reports/payment-types", {
    params: { startDate, endDate },
  });
  return data.data;
};

/**
 * Fetch average bill value for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<number>} Average bill value
 */
export const fetchAverageBillValue = async (startDate, endDate) => {
  const { data } = await api.get("/reports/average-bill-value", {
    params: { startDate, endDate },
  });
  return data.data.averageBillValue;
};

/**
 * Fetch outstanding bills for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Outstanding bills data
 */
export const fetchOutstandingBills = async (startDate, endDate) => {
  const { data } = await api.get("/reports/outstanding-bills", {
    params: { startDate, endDate },
  });
  return data.data;
};

/**
 * Fetch category sales for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Category sales data
 */
export const fetchCategorySales = async (startDate, endDate) => {
  const { data } = await api.get("/reports/category-sales", {
    params: { startDate, endDate },
  });
  return data.data;
};

/**
 * Fetch all performance comparisons in a single API call (recommended)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} All performance comparison data
 */
export const fetchPerformanceComparisons = async (startDate, endDate) => {
  const { data } = await api.get("/reports/performance-comparisons", {
    params: { startDate, endDate },
  });
  return data.data;
};

/**
 * Fetch weekly performance comparison
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Weekly performance data
 */
export const fetchWeeklyPerformance = async (startDate, endDate) => {
  const { data } = await api.get("/reports/weekly-performance", {
    params: { startDate, endDate },
  });
  return data.data;
};

/**
 * Fetch monthly performance comparison
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Monthly performance data
 */
export const fetchMonthlyPerformance = async (startDate, endDate) => {
  const { data } = await api.get("/reports/monthly-performance", {
    params: { startDate, endDate },
  });
  return data.data;
};

/**
 * Fetch weekend vs weekday performance comparison
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Weekend/weekday performance data
 */
export const fetchWeekendWeekdayPerformance = async (startDate, endDate) => {
  const { data } = await api.get("/reports/weekend-weekday-performance", {
    params: { startDate, endDate },
  });
  return data.data;
};

/**
 * Fetch day of week performance
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Day of week performance data
 */
export const fetchDayOfWeekPerformance = async (startDate, endDate) => {
  const { data } = await api.get("/reports/day-of-week-performance", {
    params: { startDate, endDate },
  });
  return data.data;
};
