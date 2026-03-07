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

exports.getPendingInvoices = async (req, res, next) => {
  try {
    const data = await service.getPendingInvoices();
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getPurchases = async (req, res, next) => {
  try {
    const data = await service.getPurchases(req.params.id);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const data = await service.getPayments(req.params.id);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.createPayment = async (req, res, next) => {
  try {
    const data = await service.createPayment(
      req.params.id,
      req.body,
      buildContext(req),
    );
    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.getStatement = async (req, res, next) => {
  try {
    const data = await service.getStatement(
      req.params.id,
      req.query.from,
      req.query.to,
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
