const paymentService = require("./payments.service");
const logger = require("../../utils/logger");

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
  console.log("Payment Payload", req.body);
  const { billId } = req.params;
  const userId = req.user?.id;
  const { paymentMethod: paymentMode, amount } = req.body;

  logger.info("Confirm Bill Request Received", {
    billId,
    userId,
    paymentMode,
    amount,
  });

  if (!billId) {
    logger.warn("Bill ID is missing", { billId });
    return res.status(400).json({
      success: false,
      message: "Bill ID is required",
    });
  }

  if (!userId) {
    logger.warn("User ID is missing", { userId });
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    await paymentService.confirmBill({
      billId,
      userId,
      paymentMode,
      amount,
    });

    logger.info("Bill confirmation successful");

    return res.status(200).json({
      success: true,
      message: "Bill confirmed successfully",
    });
  } catch (error) {
    logger.error("Database error on confirming bill", {
      billId,
      userId,
      paymentMode,
      error,
    });

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to confirm bill",
    });
  }
};
