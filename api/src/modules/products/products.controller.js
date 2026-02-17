const service = require("./products.service");
const { respond, buildContext } = require("../../utils/common");


exports.listProducts = async (req, res, next) => {
  try {
    const data = await service.list(req.query);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.productId);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const data = await service.create(req.body, buildContext(req));
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const data = await service.update(
      req.params.productId,
      req.body,
      buildContext(req),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.updateProductStatus = async (req, res, next) => {
  try {
    const data = await service.updateStatus(
      req.params.productId,
      req.body.status,
      buildContext(req),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.archiveProduct = async (req, res, next) => {
  try {
    await service.archive(req.params.productId, buildContext(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
