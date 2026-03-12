const service = require("./system-roles.service");
const { respond } = require("../../utils/common");

exports.listAll = async (req, res, next) => {
  try {
    const data = await service.listAll();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body);
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = await service.update(req.params.code, req.body);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove(req.params.code);
    respond(res, 204);
  } catch (err) {
    next(err);
  }
};
