const getSupabase = require("../../config/supabase");

/**
 * Generic helper to call RPC safely
 * @param {string} rpcName - The name of the RPC function to call
 * @param {object} params - Parameters to pass to the RPC function
 * @returns {Promise<any>} The result from the RPC call
 * @throws {Error} If the RPC call fails
 */
const callRpc = async (rpcName, params) => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(rpcName, params);
  if (error) throw error;
  return data;
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
    return callRpc("rpc_total_revenue", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }

  /**
   * Get daily revenue breakdown for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<{business_date: Date, total_revenue: number}>>} Daily revenue data
   */
  async getDailyRevenue(startDate, endDate) {
    return callRpc("rpc_daily_revenue", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }

  /**
   * Get payment type summary for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<{payment_type: string, total_amount: number, count: number}>>} Payment type summary
   */
  async getPaymentTypeSummary(startDate, endDate) {
    return callRpc("rpc_payment_type_summary", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }

  /**
   * Get average bill value for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<number>} Average bill value
   */
  async getAverageBillValue(startDate, endDate) {
    return callRpc("rpc_avg_bill_value", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }

  /**
   * Get outstanding bills for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<Object>>} Outstanding bills data
   */
  async getOutstandingBills(startDate, endDate) {
    return callRpc("rpc_outstanding_bills", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }

  /**
   * Get category sales for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<{category_id: string, category_name: string, total_quantity: number, total_sales: number}>>} Category sales data
   */
  async getCategorySales(startDate, endDate) {
    return callRpc("rpc_category_sales", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }

  /**
   * Get weekly performance comparison
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<Object>>} Weekly performance data
   */
  async getWeeklyPerformance(startDate, endDate) {
    return callRpc("rpc_weekly_performance", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }

  /**
   * Get monthly performance comparison
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<Object>>} Monthly performance data
   */
  async getMonthlyPerformance(startDate, endDate) {
    return callRpc("rpc_monthly_performance", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }

  /**
   * Get weekend vs weekday performance comparison
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<Object>>} Weekend/weekday performance data
   */
  async getWeekendWeekdayPerformance(startDate, endDate) {
    return callRpc("rpc_weekend_weekday_performance", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }

  /**
   * Get day of week performance
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<Object>>} Day of week performance data
   */
  async getDayOfWeekPerformance(startDate, endDate) {
    return callRpc("rpc_day_of_week_performance", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }

  /**
   * Get daily sales breakdown by category
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array<Object>>} Daily category breakdown data
   */
  async getDailyCategoryBreakdown(startDate, endDate) {
    return callRpc("rpc_daily_category_breakdown", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }

  async getTopSellingProducts(startDate, endDate) {
    return callRpc("rpc_top_selling_products", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }

  async getBillStatusSummary(startDate, endDate) {
    return callRpc("rpc_bill_status_summary", {
      p_start_date: startDate,
      p_end_date: endDate,
    });
  }
}

module.exports = new ReportsRepository();
