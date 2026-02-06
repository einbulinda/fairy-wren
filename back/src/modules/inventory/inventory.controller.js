const stockService = require("./services/inventory.stock.service");
const restockService = require("./services/inventory.restock.service");
const receivingService = require("./services/inventory.receiving.service");
const stockTakeService = require("./services/inventory.stocktake.service");
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

//TODO: TO CHECK IF THE BELOW ARE DUPLICATES

/* ---------- STOCK VISIBILITY ---------- */
exports.getInventoryItems = async (req, res, next) => {
  try {
    const { data, error } = await readRepo.getTrackedStock();
    if (error) throw new Error("FAILED_TO_FETCH_INVENTORY_STOCK");

    respond(res, 200, data);
  } catch (e) {
    next(e);
  }
};

/* ---------- RESTOCK ---------- */
exports.createInventoryReceipt = async (req, res, next) => {
  try {
    const result = await restockService.restock(req.body, buildContext(req));
    respond(res, 201, result);
  } catch (e) {
    next(e);
  }
};
