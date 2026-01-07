const billService = require("./bills.service");

// Create a new bill
exports.createBill = async (req, res) => {
  try {
    const bill = await billService.createBill({
      customer_name: req.body.customerName,
      created_by: req.user.id,
    });

    res.json(bill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Add round
exports.addRound = async (req, res) => {
  try {
    //Create Round
    const result = await billService.addRound({
      billId: req.params.billId,
      roundNumber: req.body.roundNumber,
      items: req.body.items,
      userId: req.user.id,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark bill as paid
exports.payBills = async (req, res) => {
  try {
    const payment = billService.payBill({
      billId: req.params.billId,
      amount: req.body.amount.total,
      paymentMethod: req.body.paymentMethod,
      userId: req.user.id,
    });

    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Confirm payments
exports.confirmPayment = async (req, res) => {
  try {
    await billService.confirmPayment({
      paymentId: req.params.paymentId,
      userId: req.user.id,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get Open Bills
exports.openBills = async (req, res) => {
  try {
    const data = await billService.getOpenBills();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Bill by ID
exports.getBillById = async (req, res) => {
  try {
    const data = await billService.getBillById(req.params.billId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Bills
exports.getAllBills = async (req, res) => {
  try {
    const data = await billService.getAllBills();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
