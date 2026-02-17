const service = require("./suppliers.service");
const { respond, buildContext } = require("../../utils/common");

exports.listSuppliers = async (req, res, next) => {
  try {
    const data = await service.list();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getSupplier = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const data = await service.create(req.body, buildContext(req));
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const data = await service.update(
      req.params.id,
      req.body,
      buildContext(req),
    );

    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.archiveSupplier = async (req, res, next) => {
  try {
    await service.archive(req.params.id, req.query.active, buildContext(req));

    respond(res, 204, { success: true });
  } catch (err) {
    next(err);
  }
};
