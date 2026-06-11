const pool = require("../../config/db");

/**
 * Generic helper to call a PostgreSQL function safely
 * @param {string} funcName - The name of the function to call
 * @param {Array} params - Positional parameters for the function
 * @returns {Promise<any>} The result rows from the function call
 * @throws {Error} If the query fails
 */
const callFunc = async (funcName, params = []) => {
  const placeholders = params.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `SELECT * FROM ${funcName}(${placeholders})`;
  const { rows } = await pool.query(sql, params);

  // PostgreSQL names the output column after the function when it returns a
  // scalar or JSONB value (not a TABLE). Unwrap that single cell so callers
  // get the value directly — matching the behaviour of supabase.rpc().
  if (
    rows.length === 1 &&
    Object.keys(rows[0]).length === 1 &&
    rows[0][funcName] !== undefined
  ) {
    return rows[0][funcName];
  }

  return rows;
};

/**
 * Repository class for reports data access
 */
class ReportsRepository {
  /**
   * Get total revenue for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<number>} Total revenue
   */
  async getTotalRevenue(startDate, endDate) {
    return callFunc("rpc_total_revenue", [startDate, endDate]);
  }

  /**
   * Get daily revenue breakdown for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<{business_date: Date, total_revenue: number}>>} Daily revenue data
   */
  async getDailyRevenue(startDate, endDate) {
    return callFunc("rpc_daily_revenue", [startDate, endDate]);
  }

  /**
   * Get payment type summary for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<{payment_type: string, total_amount: number, count: number}>>} Payment type summary
   */
  async getPaymentTypeSummary(startDate, endDate) {
    return callFunc("rpc_payment_type_summary", [startDate, endDate]);
  }

  /**
   * Get average bill value for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<number>} Average bill value
   */
  async getAverageBillValue(startDate, endDate) {
    return callFunc("rpc_avg_bill_value", [startDate, endDate]);
  }

  /**
   * Get outstanding bills for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<Object>>} Outstanding bills data
   */
  async getOutstandingBills(startDate, endDate) {
    return callFunc("rpc_outstanding_bills", [startDate, endDate]);
  }

  /**
   * Get category sales for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<{category_id: string, category_name: string, total_quantity: number, total_sales: number}>>} Category sales data
   */
  async getCategorySales(startDate, endDate) {
    return callFunc("rpc_category_sales", [startDate, endDate]);
  }

  /**
   * Get weekly performance comparison
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<Object>>} Weekly performance data
   */
  async getWeeklyPerformance(startDate, endDate) {
    return callFunc("rpc_weekly_performance", [startDate, endDate]);
  }

  /**
   * Get monthly performance comparison
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<Object>>} Monthly performance data
   */
  async getMonthlyPerformance(startDate, endDate) {
    return callFunc("rpc_monthly_performance", [startDate, endDate]);
  }

  /**
   * Get weekend vs weekday performance comparison
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<Object>>} Weekend/weekday performance data
   */
  async getWeekendWeekdayPerformance(startDate, endDate) {
    return callFunc("rpc_weekend_weekday_performance", [startDate, endDate]);
  }

  /**
   * Get day of week performance
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<Object>>} Day of week performance data
   */
  async getDayOfWeekPerformance(startDate, endDate) {
    return callFunc("rpc_day_of_week_performance", [startDate, endDate]);
  }

  /**
   * Get daily sales breakdown by category
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<Object>>} Daily category breakdown data
   */
  async getDailyCategoryBreakdown(startDate, endDate) {
    return callFunc("rpc_daily_category_breakdown", [startDate, endDate]);
  }

  async getTopSellingProducts(startDate, endDate) {
    return callFunc("rpc_top_selling_products", [startDate, endDate]);
  }

  async getBillStatusSummary(startDate, endDate) {
    return callFunc("rpc_bill_status_summary", [startDate, endDate]);
  }

  async getBalanceSheet(asOfDate) {
    return callFunc("rpc_balance_sheet", [asOfDate]);
  }

  async getNetIncome(asOfDate) {
    return callFunc("rpc_net_income", [asOfDate]);
  }

  async getIncomeStatement(startDate, endDate) {
    return callFunc("rpc_income_statement", [startDate, endDate]);
  }

  async getTrialBalance(startDate, endDate) {
    return callFunc("rpc_trial_balance", [startDate, endDate]);
  }

  async getCashFlowData(startDate, endDate) {
    return callFunc("rpc_cash_flow_data", [startDate, endDate]);
  }

  async getEquityChanges(startDate, endDate) {
    return callFunc("rpc_equity_changes", [startDate, endDate]);
  }

  async getHourlyRevenue(date) {
    return callFunc("rpc_hourly_revenue", [date]);
  }

  async getZReport(date) {
    return callFunc("rpc_z_report", [date]);
  }
}

module.exports = new ReportsRepository();
