const service = require("./mpesa.service");
const { buildContext, respond } = require("../../utils/common");

exports.listTransactions = async (req, res, next) => {
  try {
    respond(res, 200, await service.listTransactions(req.query, buildContext(req)));
  } catch (err) {
    next(err);
  }
};

exports.getTransaction = async (req, res, next) => {
  try {
    respond(res, 200, await service.getTransaction(req.params.id, buildContext(req)));
  } catch (err) {
    next(err);
  }
};

exports.getSuggestions = async (req, res, next) => {
  try {
    respond(res, 200, await service.getSuggestions(req.params.id, buildContext(req)));
  } catch (err) {
    next(err);
  }
};

exports.listStaff = async (req, res, next) => {
  try {
    respond(res, 200, await service.listStaff());
  } catch (err) {
    next(err);
  }
};

exports.allocate = async (req, res, next) => {
  try {
    respond(res, 201, await service.allocate(req.params.id, req.body, buildContext(req)));
  } catch (err) {
    next(err);
  }
};

exports.getRegister = async (req, res, next) => {
  try {
    respond(res, 200, await service.getRegister(req.query, buildContext(req)));
  } catch (err) {
    next(err);
  }
};

exports.getSummary = async (req, res, next) => {
  try {
    respond(res, 200, await service.getSummary());
  } catch (err) {
    next(err);
  }
};

exports.listPayouts = async (req, res, next) => {
  try {
    respond(res, 200, await service.listPayouts(req.query));
  } catch (err) {
    next(err);
  }
};

exports.payTips = async (req, res, next) => {
  try {
    respond(res, 201, await service.payTips(req.body, buildContext(req)));
  } catch (err) {
    next(err);
  }
};

exports.reverseAllocation = async (req, res, next) => {
  try {
    respond(res, 200, await service.reverseAllocation(req.params.id, req.body, buildContext(req)));
  } catch (err) {
    next(err);
  }
};
