const reportsRepository = require("./reports.repository");

/**
 * Service class for reports business logic
 */
class ReportsService {
  /**
   * Validate date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @throws {Error} If dates are invalid
   */
  validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error("Start date and end date are required");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date format");
    }

    if (start > end) {
      throw new Error("Start date cannot be after end date");
    }

    // Prevent excessively large date ranges (e.g., more than 1 year)
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      throw new Error("Date range cannot exceed 1 year");
    }
  }

  /**
   * Get total revenue for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<number>} Total revenue
   */
  async getTotalRevenue(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const revenue = await reportsRepository.getTotalRevenue(startDate, endDate);
    return revenue || 0;
  }

  /**
   * Get daily revenue breakdown for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Daily revenue data
   */
  async getDailyRevenue(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const data = await reportsRepository.getDailyRevenue(startDate, endDate);
    return data || [];
  }

  /**
   * Get payment type summary for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Payment type summary
   */
  async getPaymentTypeSummary(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const data = await reportsRepository.getPaymentTypeSummary(
      startDate,
      endDate
    );
    return data || [];
  }

  /**
   * Get average bill value for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<number>} Average bill value
   */
  async getAverageBillValue(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const avg = await reportsRepository.getAverageBillValue(
      startDate,
      endDate
    );
    return avg || 0;
  }

  /**
   * Get outstanding bills for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Outstanding bills data
   */
  async getOutstandingBills(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const data = await reportsRepository.getOutstandingBills(
      startDate,
      endDate
    );
    return data || [];
  }

  /**
   * Get category sales for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Category sales data
   */
  async getCategorySales(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const data = await reportsRepository.getCategorySales(startDate, endDate);
    return data || [];
  }

  /**
   * Get all dashboard metrics in a single call
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Object>} All dashboard metrics
   */
  async getTopSellingProducts(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const data = await reportsRepository.getTopSellingProducts(
      startDate,
      endDate
    );
    return data || [];
  }

  async getBillStatusSummary(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const data = await reportsRepository.getBillStatusSummary(
      startDate,
      endDate
    );
    return data || [];
  }

  async getDashboardMetrics(startDate, endDate) {
    this.validateDateRange(startDate, endDate);

    // Compute previous month date range for growth comparison
    const start = new Date(startDate);
    const prevMonthStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    const prevMonthEnd = new Date(start.getFullYear(), start.getMonth(), 0);
    const fmt = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    // Fetch all metrics in parallel for better performance
    const [
      totalRevenue,
      dailyRevenue,
      paymentTypes,
      averageBillValue,
      outstandingBills,
      categorySales,
      topSellingProducts,
      previousMonthRevenue,
      weeklyPerformance,
      billStatusSummary,
      previousMonthBills,
      dayOfWeekPerformance,
    ] = await Promise.all([
      this.getTotalRevenue(startDate, endDate),
      this.getDailyRevenue(startDate, endDate),
      this.getPaymentTypeSummary(startDate, endDate),
      this.getAverageBillValue(startDate, endDate),
      this.getOutstandingBills(startDate, endDate),
      this.getCategorySales(startDate, endDate),
      this.getTopSellingProducts(startDate, endDate),
      this.getTotalRevenue(fmt(prevMonthStart), fmt(prevMonthEnd)),
      this.getWeeklyPerformance(startDate, endDate),
      this.getBillStatusSummary(startDate, endDate),
      this.getBillStatusSummary(fmt(prevMonthStart), fmt(prevMonthEnd)),
      this.getDayOfWeekPerformance(startDate, endDate),
    ]);

    const revenueGrowth =
      previousMonthRevenue > 0
        ? ((totalRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : totalRevenue > 0
          ? 100
          : 0;

    const totalBills = billStatusSummary.reduce((s, r) => s + Number(r.count), 0);
    const prevTotalBills = previousMonthBills.reduce((s, r) => s + Number(r.count), 0);
    const billsGrowth =
      prevTotalBills > 0
        ? ((totalBills - prevTotalBills) / prevTotalBills) * 100
        : totalBills > 0
          ? 100
          : 0;

    return {
      totalRevenue,
      previousMonthRevenue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      totalBills,
      billsGrowth: Math.round(billsGrowth * 10) / 10,
      dailyRevenue,
      paymentTypes,
      averageBillValue,
      outstandingBills,
      categorySales,
      topSellingProducts,
      weeklyPerformance,
      billStatusSummary,
      dayOfWeekPerformance,
    };
  }

  /**
   * Get weekly performance comparison
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Weekly performance data
   */
  async getWeeklyPerformance(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const data = await reportsRepository.getWeeklyPerformance(
      startDate,
      endDate
    );
    return data || [];
  }

  /**
   * Get monthly performance comparison
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Monthly performance data
   */
  async getMonthlyPerformance(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const data = await reportsRepository.getMonthlyPerformance(
      startDate,
      endDate
    );
    return data || [];
  }

  /**
   * Get weekend vs weekday performance comparison
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Weekend/weekday performance data
   */
  async getWeekendWeekdayPerformance(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const data = await reportsRepository.getWeekendWeekdayPerformance(
      startDate,
      endDate
    );
    return data || [];
  }

  /**
   * Get day of week performance
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Day of week performance data
   */
  async getDayOfWeekPerformance(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const data = await reportsRepository.getDayOfWeekPerformance(
      startDate,
      endDate
    );
    return data || [];
  }

  /**
   * Get all performance comparisons in a single call
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Object>} All performance comparison data
   */
  async getPerformanceComparisons(startDate, endDate) {
    this.validateDateRange(startDate, endDate);

    const [
      weeklyPerformance,
      monthlyPerformance,
      weekendWeekdayPerformance,
      dayOfWeekPerformance,
      dailyCategoryBreakdown,
    ] = await Promise.all([
      this.getWeeklyPerformance(startDate, endDate),
      this.getMonthlyPerformance(startDate, endDate),
      this.getWeekendWeekdayPerformance(startDate, endDate),
      this.getDayOfWeekPerformance(startDate, endDate),
      this.getDailyCategoryBreakdown(startDate, endDate),
    ]);

    return {
      weeklyPerformance,
      monthlyPerformance,
      weekendWeekdayPerformance,
      dayOfWeekPerformance,
      dailyCategoryBreakdown,
    };
  }

  /**
   * Get daily sales breakdown by category
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Daily category breakdown data
   */
  async getDailyCategoryBreakdown(startDate, endDate) {
    this.validateDateRange(startDate, endDate);
    const data = await reportsRepository.getDailyCategoryBreakdown(
      startDate,
      endDate
    );
    return data || [];
  }
}

module.exports = new ReportsService();
