const billService = require("./bills.service");
const logger = require("../../utils/logger");

// Create a new bill
exports.createBill = async (req, res) => {
  const { customerName: customer_name } = req.body;
  const { id: created_by } = req.user;

  logger.info("Create bill request received", {
    customer_name,
    created_by,
  });

  try {
    const bill = await billService.createBill({
      customer_name,
      created_by,
    });

    res.json(bill);
  } catch (err) {
    logger.error("Create bill request failed", {
      customer_name,
      created_by,
      err,
    });

    res.status(500).json({ error: err.message });
  }
};

// Add round
exports.addRound = async (req, res) => {
  const { billId } = req.params;
  const { items } = req.body;
  const { id: userId } = req.user;

  logger.info("Add round request received", {
    billId,
    userId,
    itemsCount: items.length,
  });

  try {
    //Create Round
    const result = await billService.addRound({
      billId,
      items,
      userId,
    });

    res.json(result);
  } catch (err) {
    logger.error("Add round request failed", {
      billId,
      userId,
      err,
    });

    res.status(500).json({ error: err.message });
  }
};

// Mark bill as paid
exports.payBills = async (req, res) => {
  const { billId } = req.params;
  const { amount, paymentMethod } = req.body;
  const { id: userId } = req.user;

  logger.info("Mark bill as paid request received", {
    billId,
    amount,
    paymentMethod,
    userId,
  });

  try {
    const payment = billService.payBill({
      billId,
      amount: amount,
      paymentMethod,
      userId,
    });

    res.json(payment);
  } catch (err) {
    logger.error("Marking bill paid failed", {
      billId,
      amount,
      paymentMethod,
      err,
    });
    res.status(500).json({ error: err.message });
  }
};

// Get Open Bills
exports.openBills = async (req, res) => {
  logger.info("Getting Open Bills request received");
  try {
    const data = await billService.getOpenBills();
    res.json(data);
  } catch (err) {
    logger.error("Getting Open Bills failed", {
      err,
    });
    res.status(500).json({ error: err.message });
  }
};

// Get Bill by ID
exports.getBillById = async (req, res) => {
  const { billId } = req.params;

  logger.info("Getting bill by ID received", { billId });
  try {
    const data = await billService.getBillById(req.params.billId);
    res.json(data);
  } catch (err) {
    logger.error("Getting Open Bills failed", { billId, err });
    res.status(500).json({ error: err.message });
  }
};

// Get All Bills
exports.getAllBills = async (req, res) => {
  logger.info("Getting all bills request received");
  try {
    const data = await billService.getAllBills();
    res.json(data);
  } catch (err) {
    logger.error("Getting All Bills failed", { err });
    res.status(500).json({ error: err.message });
  }
};

// Void Open Bill
exports.voidOpenBill = async (req, res) => {
  const { billId } = req.params;
  const { id: userId } = req.user;
  logger.info("Void open bill request received", { billId, userId });
  try {
    const result = await billService.voidBill({ billId, userId });
    res.json(result);
  } catch (err) {
    logger.error("Voiding open bill failed", {
      billId,
      userId,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
};
