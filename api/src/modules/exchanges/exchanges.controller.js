const service = require("./exchanges.service");
const { buildContext, respond } = require("../../utils/common");

/* ======================================================
   BUSINESS PARTNERS
   ====================================================== */
exports.listPartners = async (req, res, next) => {
  try {
    const data = await service.listPartners(req.query);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.createPartner = async (req, res, next) => {
  try {
    const data = await service.createPartner(req.body, buildContext(req));
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   PRODUCT EXCHANGES
   ====================================================== */
exports.createExchange = async (req, res, next) => {
  try {
    const data = await service.createExchange(req.body, buildContext(req));
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.getExchangeDetail = async (req, res, next) => {
  try {
    const data = await service.getExchangeDetail(req.params.id);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getAllExchanges = async (req, res, next) => {
  try {
    const data = await service.getAllExchanges({
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
      partner_id: req.query.partner_id,
      direction: req.query.direction,
      approval_status: req.query.approval_status,
      from: req.query.from,
      to: req.query.to,
    });
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getPendingExchanges = async (req, res, next) => {
  try {
    const data = await service.getPendingExchanges();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.approveExchange = async (req, res, next) => {
  try {
    const data = await service.approveExchange(req.params.id, buildContext(req));
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.rejectExchange = async (req, res, next) => {
  try {
    const data = await service.rejectExchange(req.params.id, req.body, buildContext(req));
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
