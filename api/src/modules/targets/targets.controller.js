const service = require("./targets.service");
const { respond } = require("../../utils/common");

// ==========================================
// BUSINESS TARGETS CONTROLLER
// ==========================================

exports.getBusinessTarget = async (req, res, next) => {
  try {
    const { year, month } = req.params;

    const data = await service.getBusinessTarget(
      parseInt(year),
      parseInt(month),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getYearlyBusinessTargets = async (req, res, next) => {
  try {
    const { year } = req.params;
    const data = await service.getYearlyBusinessTargets(parseInt(year));
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.saveBusinessTarget = async (req, res, next) => {
  try {
    const data = await service.saveBusinessTarget(req.body, req.user.id);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.bulkUpdateBusinessTargets = async (req, res, next) => {
  try {
    const { year } = req.params;
    const { targets } = req.body;
    const data = await service.bulkUpdateBusinessTargets(
      parseInt(year),
      targets,
      req.user.id,
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// USER/STAFF TARGETS CONTROLLER
// ==========================================

exports.getUserTarget = async (req, res, next) => {
  try {
    const { userId, year, month } = req.params;
    const data = await service.getUserTarget(
      userId,
      parseInt(year),
      parseInt(month),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getAllUserTargets = async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const data = await service.getAllUserTargets(
      parseInt(year),
      parseInt(month),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.saveUserTarget = async (req, res, next) => {
  try {
    const data = await service.saveUserTarget(req.body, req.user.id);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.bulkUpdateUserTargets = async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const { targets } = req.body;
    const data = await service.bulkUpdateUserTargets(
      parseInt(year),
      parseInt(month),
      targets,
      req.user.id,
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// CATEGORY TARGETS CONTROLLER
// ==========================================

exports.getCategoryTargets = async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const data = await service.getCategoryTargets(
      parseInt(year),
      parseInt(month),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.saveCategoryTarget = async (req, res, next) => {
  try {
    const data = await service.saveCategoryTarget(req.body, req.user.id);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// DASHBOARD INTEGRATION
// ==========================================

exports.getDashboardTargets = async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const { totalRevenue, grossMargin } = req.query;

    const data = await service.getDashboardTargets(
      parseInt(year),
      parseInt(month),
      {
        totalRevenue: parseFloat(totalRevenue) || 0,
        grossMargin: parseFloat(grossMargin) || 0,
      },
    );

    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
