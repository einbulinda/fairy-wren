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
    const data = await service.fetchBillsWithPayments();

    respond(res, 200, data);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/payments/:billId
 * Confirm bill and mark payments as paid

exports.confirmBillController = async (req, res) => {
  const { billId } = req.params;
  const { id: userId, role } = req.user;
  const { paymentMethod: paymentMode, amount } = req.body;

  logger.info("Confirm Bill Request Received", {
    billId,
    userId,
    paymentMode,
    amount,
    role,
  });

  if (!billId || !amount || !paymentMode) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Missing required payment fields",
    });
  }

  try {
    const result = await paymentService.processPayment({
      billId,
      userId,
      paymentMode,
      amount,
      role,
    });

    logger.info("Bill confirmation successful");

    return res.status(200).json({
      success: true,
      action: result.action,
      bill: {
        id: billId,
        status: result.bill_status,
      },
      payment: {
        status: result.payment_status,
      },
      message: mapActionToMessage(result.action),
    });
  } catch (error) {
    logger.error("Database error on confirming bill", {
      billId,
      userId,
      paymentMode,
      error,
    });

    return res.status(409).json({
      success: false,
      code: "INVALID_STATE",
      message: error.message,
    });
  }
}; 
*/
