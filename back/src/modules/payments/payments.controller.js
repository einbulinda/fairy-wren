const paymentService = require("./payments.service");

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
  const userId = req.user?.id;
  const { paymentMethod: paymentMode } = req.body;

  if (!billId) {
    return res.status(400).json({
      success: false,
      message: "Bill ID is required",
    });
  }

  if (!userId) {
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
    });

    return res.status(200).json({
      success: true,
      message: "Bill confirmed successfully",
    });
  } catch (error) {
    console.error("Confirm bill failed:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to confirm bill",
    });
  }
};
