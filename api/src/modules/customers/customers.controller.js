const repo = require("./customers.repository");
const { respond } = require("../../utils/common");

exports.listAccounts = async (req, res, next) => {
  try {
    const data = await repo.listAccounts(req.query);
    res.set("Cache-Control", "private, max-age=15");
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.createAccount = async (req, res, next) => {
  try {
    const { name, phone, email, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: "Name is required" });
    const customer = await repo.createAccount({ name: name.trim(), phone, email, notes });
    respond(res, 201, customer);
  } catch (err) {
    next(err);
  }
};

exports.updateAccount = async (req, res, next) => {
  try {
    const customer = await repo.updateAccount(req.params.id, req.body);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    respond(res, 200, customer);
  } catch (err) {
    next(err);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    await repo.deleteAccount(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.getAccountBills = async (req, res, next) => {
  try {
    const data = await repo.getAccountBills(req.params.id, req.query);
    res.set("Cache-Control", "private, max-age=10");
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.listUnlinkedNames = async (req, res, next) => {
  try {
    const data = await repo.listUnlinkedNames(req.query);
    res.set("Cache-Control", "private, max-age=15");
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.linkName = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    const count = await repo.linkNameToAccount(req.params.id, name);
    respond(res, 200, { linked: count });
  } catch (err) {
    next(err);
  }
};

exports.unlinkBill = async (req, res, next) => {
  try {
    await repo.unlinkBill(req.params.billId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.listUnlinkedBillsForName = async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.query.name || "");
    if (!name) return res.status(400).json({ success: false, message: "name query param required" });
    const data = await repo.listUnlinkedBillsForName(name);
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.linkBills = async (req, res, next) => {
  try {
    const { billIds } = req.body;
    if (!Array.isArray(billIds) || billIds.length === 0)
      return res.status(400).json({ success: false, message: "billIds array is required" });
    const count = await repo.linkBillsByIds(req.params.id, billIds);
    respond(res, 200, { linked: count });
  } catch (err) {
    next(err);
  }
};
