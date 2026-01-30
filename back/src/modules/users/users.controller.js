const service = require("./users.service");
const { respond, buildContext } = require("../../utils/common");

exports.listUsers = async (req, res, next) => {
  try {
    const data = await service.list(req.query);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.userId);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const data = await service.create(req.body, buildContext(req));
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const data = await service.update(
      req.params.userId,
      req.body,
      buildContext(req),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const data = await service.updateRole(
      req.params.userId,
      req.body,
      buildContext(req),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const data = await service.updateStatus(
      req.params.userId,
      req.body.status,
      buildContext(req),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.archiveUser = async (req, res, next) => {
  try {
    await service.archive(req.params.userId, buildContext(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
