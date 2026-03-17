const reportsService = require("./reports.service");

/**
 * Controller class for reports endpoints
 */
class ReportsController {
  /**
   * Extract and validate date range from request query parameters
   * @param {Object} req - Express request object
   * @returns {Object} Object containing startDate and endDate
   * @throws {Error} If dates are missing or invalid
   */
  extractDateRange(req) {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      const err = new Error("startDate and endDate query parameters are required");
      err.status = 400;
      throw err;
    }

    return { startDate, endDate };
  }

  /**
   * Handle errors and send appropriate HTTP responses
   * @param {Error} err - Error object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  handleError(err, res, next) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message,
        status: err.status,
      });
    }

    // Log unexpected errors
    console.error("Reports Controller Error:", err);
    next(err);
  }

  /**
   * Get total revenue for a date range
   * GET /api/reports/total-revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getTotalRevenue(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const total = await reportsService.getTotalRevenue(startDate, endDate);

      res.status(200).json({
        data: {
          totalRevenue: total,
          startDate,
          endDate,
        },
        success: true,
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * Get daily revenue breakdown for a date range
   * GET /api/reports/daily-revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getDailyRevenue(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getDailyRevenue(startDate, endDate);

      res.status(200).json({
        data,
        success: true,
        meta: {
          startDate,
          endDate,
          count: data.length,
        },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * Get payment type summary for a date range
   * GET /api/reports/payment-types?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getPaymentTypeSummary(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getPaymentTypeSummary(
        startDate,
        endDate
      );

      res.status(200).json({
        data,
        success: true,
        meta: {
          startDate,
          endDate,
          count: data.length,
        },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * Get average bill value for a date range
   * GET /api/reports/average-bill-value?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getAverageBillValue(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const avg = await reportsService.getAverageBillValue(startDate, endDate);

      res.status(200).json({
        data: {
          averageBillValue: avg,
          startDate,
          endDate,
        },
        success: true,
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * Get outstanding bills for a date range
   * GET /api/reports/outstanding-bills?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getOutstandingBills(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getOutstandingBills(
        startDate,
        endDate
      );

      res.status(200).json({
        data,
        success: true,
        meta: {
          startDate,
          endDate,
          count: data.length,
        },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * Get category sales for a date range
   * GET /api/reports/category-sales?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getCategorySales(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getCategorySales(startDate, endDate);

      res.status(200).json({
        data,
        success: true,
        meta: {
          startDate,
          endDate,
          count: data.length,
        },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * Get all dashboard metrics in a single request
   * GET /api/reports/dashboard?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getDashboardMetrics(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const metrics = await reportsService.getDashboardMetrics(
        startDate,
        endDate
      );

      res.status(200).json({
        data: metrics,
        success: true,
        meta: {
          startDate,
          endDate,
        },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * Get weekly performance comparison
   * GET /api/reports/weekly-performance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getWeeklyPerformance(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getWeeklyPerformance(
        startDate,
        endDate
      );

      res.status(200).json({
        data,
        success: true,
        meta: {
          startDate,
          endDate,
          count: data.length,
        },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * Get monthly performance comparison
   * GET /api/reports/monthly-performance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getMonthlyPerformance(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getMonthlyPerformance(
        startDate,
        endDate
      );

      res.status(200).json({
        data,
        success: true,
        meta: {
          startDate,
          endDate,
          count: data.length,
        },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * Get weekend vs weekday performance comparison
   * GET /api/reports/weekend-weekday-performance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getWeekendWeekdayPerformance(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getWeekendWeekdayPerformance(
        startDate,
        endDate
      );

      res.status(200).json({
        data,
        success: true,
        meta: {
          startDate,
          endDate,
          count: data.length,
        },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * Get day of week performance
   * GET /api/reports/day-of-week-performance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getDayOfWeekPerformance(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getDayOfWeekPerformance(
        startDate,
        endDate
      );

      res.status(200).json({
        data,
        success: true,
        meta: {
          startDate,
          endDate,
          count: data.length,
        },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  /**
   * Get all performance comparisons in a single request
   * GET /api/reports/performance-comparisons?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getPerformanceComparisons(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getPerformanceComparisons(
        startDate,
        endDate
      );

      res.status(200).json({
        data,
        success: true,
        meta: {
          startDate,
          endDate,
        },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  async getIncomeStatement(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getIncomeStatement(startDate, endDate);
      res.status(200).json({
        data,
        success: true,
        meta: { startDate, endDate },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  async getTrialBalance(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getTrialBalance(startDate, endDate);
      res.status(200).json({
        data,
        success: true,
        meta: { startDate, endDate },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  async getCashFlowStatement(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getCashFlowStatement(startDate, endDate);
      res.status(200).json({
        data,
        success: true,
        meta: { startDate, endDate },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  async getEquityChanges(req, res, next) {
    try {
      const { startDate, endDate } = this.extractDateRange(req);
      const data = await reportsService.getEquityChanges(startDate, endDate);
      res.status(200).json({
        data,
        success: true,
        meta: { startDate, endDate },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  async getBalanceSheet(req, res, next) {
    try {
      const { asOfDate } = req.query;
      if (!asOfDate) {
        const err = new Error("asOfDate query parameter is required");
        err.status = 400;
        throw err;
      }
      const data = await reportsService.getBalanceSheet(asOfDate);
      res.status(200).json({
        data,
        success: true,
        meta: { asOfDate },
      });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }

  async getZReport(req, res, next) {
    try {
      const { date } = req.query;
      if (!date) {
        const err = new Error("date query parameter is required");
        err.status = 400;
        throw err;
      }
      const data = await reportsService.getZReport(date);
      res.status(200).json({ data, success: true, meta: { date } });
    } catch (err) {
      this.handleError(err, res, next);
    }
  }
}

module.exports = new ReportsController();
