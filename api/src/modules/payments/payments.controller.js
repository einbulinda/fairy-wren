const service = require("./payments.service");
const { respond, buildContext } = require("../../utils/common");

/* ======================================================
   PROCESS PAYMENT
   ====================================================== */

/**
 * POST /payments
 * Process a payment against a bill (RPC-backed)
 */
exports.processPayment = async (req, res, next) => {
  try {
    const data = await service.processPayments(
      {
        billId: req.body.billId,
        amount: req.body.amount,
        paymentMode: req.body.paymentMode,
      },
      buildContext(req),
    );

    respond(res, 201, data);
  } catch (err) {
    next(err);
  }
};
/* ======================================================
   LIST PAYMENTS (FILTERED)
   ====================================================== */

/**
 * GET /payments
 * Query params:
 *  - type (cash | mpesa)
 *  - from (ISO date)
 *  - to (ISO date)
 *  - isPaid (true | false)
 */
exports.listPayments = async (req, res, next) => {
  try {
    const data = await service.listPayments({
      type: req.query.type,
      from: req.query.from,
      to: req.query.to,
      isPaid:
        req.query.isPaid !== undefined
          ? req.query.isPaid === "true"
          : undefined,
    });

    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/* ======================================================
   FETCH BILLS WITH PAYMENTS
   ====================================================== */

/**
 * GET /api/v2/payments/bills
 * Fetch bills with associated payments
 */
exports.fetchBillsWithPayments = async (req, res, next) => {
  try {
    const data = await service.fetchBillsWithPayments(req.query);

    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};
