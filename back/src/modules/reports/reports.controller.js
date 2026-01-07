const reportsService = require("./reports.service");

/**
 * Shared validator
 */
const requireDateRange = (req) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    const err = new Error("startDate and endDate are required");
    err.status = 400;
    throw err;
  }

  return { startDate, endDate };
};

exports.totalRevenue = async (req, res, next) => {
  try {
    const { startDate, endDate } = requireDateRange(req);
    const total = await reportsService.getTotalRevenue(startDate, endDate);
    res.json({ totalRevenue: total || 0 });
  } catch (err) {
    next(err);
  }
};

exports.dailyRevenue = async (req, res, next) => {
  try {
    const { startDate, endDate } = requireDateRange(req);
    const data = await reportsService.getDailyRevenue(startDate, endDate);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.paymentTypeSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = requireDateRange(req);
    const data = await reportsService.getPaymentTypeSummary(startDate, endDate);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.averageBillValue = async (req, res, next) => {
  try {
    const { startDate, endDate } = requireDateRange(req);
    const avg = await reportsService.getAverageBillValue(startDate, endDate);
    res.json({ averageBillValue: avg || 0 });
  } catch (err) {
    next(err);
  }
};

exports.outstandingBills = async (req, res, next) => {
  try {
    const { startDate, endDate } = requireDateRange(req);
    const data = await reportsService.getOutstandingBills(startDate, endDate);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.categorySales = async (req, res, next) => {
  try {
    const { startDate, endDate } = requireDateRange(req);
    const data = await reportsService.getCategorySales(startDate, endDate);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
