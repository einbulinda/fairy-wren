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

exports.getUnpaidInvoices = async (req, res, next) => {
  try {
    const data = await service.getUnpaidInvoices(req.params.id);
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

exports.exportStatementCsv = async (req, res, next) => {
  try {
    const supplier = await service.getById(req.params.id);
    const data = await service.getStatement(
      req.params.id,
      req.query.from,
      req.query.to,
    );

    const rows = [["Date", "Type", "Reference", "Description", "Debit", "Credit", "Balance"]];
    for (const r of data) {
      rows.push([
        r.txn_date,
        r.txn_type,
        `"${(r.reference || "").replace(/"/g, '""')}"`,
        `"${(r.description || "").replace(/"/g, '""')}"`,
        Number(r.debit || 0).toFixed(2),
        Number(r.credit || 0).toFixed(2),
        Number(r.running_balance || 0).toFixed(2),
      ]);
    }

    const csv = rows.map((r) => r.join(",")).join("\n");
    const filename = `${supplier.name.replace(/[^a-zA-Z0-9]/g, "_")}_statement.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
