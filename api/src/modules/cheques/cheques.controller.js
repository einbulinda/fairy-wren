const service = require("./cheques.service");
const { respond, buildContext } = require("../../utils/common");

exports.listCheques = async (req, res, next) => {
  try {
    const data = await service.list(req.query);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getCheque = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.chequeId);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.createCheque = async (req, res, next) => {
  try {
    const data = await service.create(req.body, buildContext(req));
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.clearCheque = async (req, res, next) => {
  try {
    const data = await service.clear(req.params.chequeId, buildContext(req));
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.voidCheque = async (req, res, next) => {
  try {
    const data = await service.void(req.params.chequeId, buildContext(req));
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
