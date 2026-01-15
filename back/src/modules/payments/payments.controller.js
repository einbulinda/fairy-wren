const paymentService = require("./payments.service");
const logger = require("../../utils/logger");
const { mapActionToMessage } = require("../../utils/common");

/**
 * GET /api/payments
 * Fetch all bills with associated payments
 */
exports.getBills = async (req, res) => {
  try {
    const bills = await paymentService.fetchBillsWithPayments();

    return res.status(200).json({
      success: true,
      data: bills,
    });
  } catch (error) {
    console.error("Get bills failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bills",
    });
  }
};

/**
 * PATCH /api/payments/:billId
 * Confirm bill and mark payments as paid
 */
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
