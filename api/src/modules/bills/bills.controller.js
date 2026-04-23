const service = require("./bills.service");
const { respond, buildContext } = require("../../utils/common");

exports.createBill = async (req, res, next) => {
  try {
    const data = await service.createBill(req.body, buildContext(req));

    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};

exports.getBill = async (req, res, next) => {
  try {
    const data = await service.getBill(req.params.id);
    res.set("Cache-Control", "private, max-age=5");
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.listBills = async (req, res, next) => {
  try {
    const { bills, pagination } = await service.listBills(req.query);

    // Bills change frequently — short private cache to absorb rapid re-fetches
    res.set("Cache-Control", "private, max-age=5");

    if (res.locals.correlationId)
      res.setHeader("X-Request-ID", res.locals.correlationId);

    return res.status(200).json({ success: true, data: bills, pagination });
  } catch (err) {
    next(err);
  }
};

exports.updateBillStatus = async (req, res, next) => {
  try {
    const data = await service.updateStatus(
      req.params.id,
      req.body,
      buildContext(req),
    );
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.voidBill = async (req, res, next) => {
  const { id: userId } = req.user;
  try {
    await service.voidBill(req.params.id, buildContext(req));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.getMyStats = async (req, res, next) => {
  try {
    const data = await service.getMyStats(req.user.id, req.query.period);
    res.set("Cache-Control", "private, max-age=15");
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

exports.addRound = async (req, res, next) => {
  try {
    await service.addRound(req.params.id, req.body, buildContext(req));
    respond(res, 201, { success: true });
  } catch (err) {
    console.log("Error adding round:", err);
    next(err);
  }
};

exports.exchangeItem = async (req, res, next) => {
  try {
    const data = await service.exchangeItem(req.params.id, req.body, buildContext(req));
    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
