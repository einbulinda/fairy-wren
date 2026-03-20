const stockService = require("./services/inventory.stock.service");
const restockService = require("./services/inventory.restock.service");
const receivingService = require("./services/inventory.receiving.service");
const stockTakeService = require("./services/inventory.stocktake.service");
const policiesService = require("./services/inventory.policies.service");
const conversionsService = require("./services/inventory.conversions.service");
const ledgerService = require("../ledger/ledger.service");
const { buildContext, respond } = require("../../utils/common");

/* ======================================================
   INVENTORY STOCK (VISIBILITY)
   ====================================================== */
exports.getInventoryItems = async (req, res, next) => {
  try {
    const data = await stockService.getInventoryItems();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   PROCUREMENT / RECEIVING
   ====================================================== */
exports.createInventoryReceipt = async (req, res, next) => {
  try {
    const data = await receivingService.receiveInventory(
      req.body,
      buildContext(req),
    );

    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.getReceiptDetail = async (req, res, next) => {
  try {
    const data = await receivingService.getReceiptDetail(req.params.id);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.markReceiptPaid = async (req, res, next) => {
  try {
    const data = await receivingService.markReceiptPaid(
      req.params.id,
      req.body,
      buildContext(req),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   STOCK TAKE (RPC-BASED)
   ====================================================== */

exports.createStockTakeSession = async (req, res, next) => {
  try {
    const data = await stockTakeService.createSession(
      req.body,
      buildContext(req),
    );
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /inventory/stock-take-sessions/incomplete
 */
exports.getIncompleteStockTakes = async (req, res, next) => {
  try {
    const data = await stockTakeService.getIncompleteSessions(req.user.id);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /inventory/stock-take-sessions/:id/items
 */
exports.recordStockTakeItem = async (req, res, next) => {
  try {
    const data = await stockTakeService.recordItem({
      stockTakeId: req.params.id,
      ...req.body,
    });

    respond(res, 201, data);
  } catch (err) {
    console.log("Error recording stock take item:", err);
    next(err);
  }
};

/**
 * GET /inventory/stock-take-sessions/:id/items
 */
exports.getStockTakeItems = async (req, res, next) => {
  try {
    const data = await stockTakeService.getSessionItems(req.params.id);

    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /inventory/stock-take-sessions/:id/complete
 */
exports.completeStockTakeSession = async (req, res, next) => {
  try {
    const data = await stockTakeService.completeSession(
      req.params.id,
      buildContext(req),
    );

    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /inventory/stock-take-sessions/:id/approve
 */
exports.approveStockTake = async (req, res, next) => {
  try {
    const data = await stockTakeService.approve(
      req.params.id,
      req.body,
      buildContext(req),
    );

    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /inventory/stock-take-sessions/:id/reject
 */
exports.rejectStockTake = async (req, res, next) => {
  try {
    const data = await stockTakeService.reject(
      req.params.id,
      req.body,
      buildContext(req),
    );

    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   STOCK TAKE REPORTING
   ====================================================== */

/**
 * GET /inventory/stock-take-adjustments
 */
exports.getStockTakeAdjustments = async (req, res, next) => {
  try {
    const data = await stockTakeService.getAdjustmentsReport(req.query);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /inventory/reports/stock-take/:id
 */
exports.getStockTakeDetail = async (req, res, next) => {
  try {
    const data = await stockTakeService.getStockTakeDetail(req.params.id);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /inventory/reports/stock-take
 * Alias for getStockTakeAdjustments with cleaner endpoint path
 */
exports.getStockTakeReports = async (req, res, next) => {
  try {
    const data = await stockTakeService.getAdjustmentsReport(req.query);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   INVENTORY LEDGER
   ====================================================== */

/**
 * GET /inventory/ledger
 */
exports.getInventoryLedger = async (req, res, next) => {
  try {
    const data = await ledgerService.getLedger(req.query);

    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   REORDER LEVEL POLICIES
   ====================================================== */

exports.getReorderPolicies = async (req, res, next) => {
  try {
    const data = await policiesService.getPolicies();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getReorderPolicy = async (req, res, next) => {
  try {
    const data = await policiesService.getPolicy(req.params.productId);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.setManualReorderLevel = async (req, res, next) => {
  try {
    const data = await policiesService.setManualOverride(
      req.params.productId,
      req.body.reorder_level,
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.clearReorderOverride = async (req, res, next) => {
  try {
    const data = await policiesService.clearOverride(req.params.productId);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getReorderSettings = async (req, res, next) => {
  try {
    const data = await policiesService.getSettings();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.updateReorderSettings = async (req, res, next) => {
  try {
    const data = await policiesService.updateSettings(req.body);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.triggerReorderRefresh = async (req, res, next) => {
  try {
    const data = await policiesService.triggerRefresh(req.body?.product_ids);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getMovementAnalysis = async (req, res, next) => {
  try {
    const data = await policiesService.getMovementAnalysis();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getReorderAlerts = async (req, res, next) => {
  try {
    const data = await policiesService.getReorderAlerts();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   PRODUCT CONVERSIONS
   ====================================================== */

exports.executeConversion = async (req, res, next) => {
  try {
    const data = await conversionsService.executeConversion(
      req.body,
      buildContext(req),
    );
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.getConversionHistory = async (req, res, next) => {
  try {
    const data = await conversionsService.getConversionHistory();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getConvertibleProducts = async (req, res, next) => {
  try {
    const data = await conversionsService.getConvertibleProducts();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getTotSize = async (req, res, next) => {
  try {
    const data = await conversionsService.getTotSize();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
