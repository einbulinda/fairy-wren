const service = require("./accounts.service");
const { respond, buildContext } = require("../../utils/common");

exports.listAccounts = async (req, res, next) => {
  try {
    const data = await service.list(req.query);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getAccount = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.accountId);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.createAccount = async (req, res, next) => {
  try {
    const data = await service.create(req.body, buildContext(req));
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.updateAccount = async (req, res, next) => {
  try {
    const data = await service.update(
      req.params.accountId,
      req.body,
      buildContext(req)
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.updateAccountStatus = async (req, res, next) => {
  try {
    const data = await service.updateStatus(
      req.params.accountId,
      req.body.active,
      buildContext(req)
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    await service.delete(req.params.accountId, buildContext(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.getChildAccounts = async (req, res, next) => {
  try {
    const data = await service.getChildren(req.params.accountId);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
