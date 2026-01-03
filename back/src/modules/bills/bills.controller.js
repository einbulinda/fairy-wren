const supabase = require("../../config/supabase");

// Create a new bill
exports.createBill = async (req, res) => {
  try {
    const { customerName } = req.body;
    const { data, error } = await supabase
      .from("bills")
      .insert({
        customer_name: customerName,
        created_by: req.user.id,
        status: "open",
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add round to bill
exports.addRound = async (req, res) => {
  try {
    const { billId } = req.params;
    const { roundNumber, items } = req.body;

    //Create Round
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        bill_id: billId,
        round_number: roundNumber,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (roundError) throw roundError;

    // Add Items to Round
    const roundItems = items.map((item) => ({
      round_id: round.id,
      product_id: item.productId,
      price: item.price,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("round_items")
      .insert(roundItems);

    if (itemsError) throw itemsError;

    // Update Products Stock
    for (const item of items) {
      await supabase.rpc("decrement_stock", {
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    res.json({ round, items: roundItems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Open Bills
exports.openBills = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bills")
      .select(
        ` *,
        rounds (
          *,
          round_items (*)
        )`
      )
      // .eq("status", "open") //Gets all Bills
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: err.message });
  }
};

// Get Bill by ID
exports.getBillById = async (req, res) => {
  try {
    const { billId } = req.params;
    const { data, error } = await supabase
      .from("bills")
      .select(`*,rounds(*,round_items(*))`)
      .eq("id", billId)
      .single();
  } catch (error) {
    res.status(500).json({ error: err.message });
  }
};

// Get All Bills
exports.getAllBills = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bills")
      .select(`*,rounds(*,round_items(*))`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: err.message });
  }
};

// Mark bill as paid
exports.payBills = async (req, res) => {
  try {
    const { billId } = req.params;
    const { paymentMethod, mpesaCode, amount } = req.body;

    console.log(req.body);

    const { error } = await supabase
      .from("bills")
      .update({
        status: "awaiting_confirmation",
        updated_by: req.user.id,
      })
      .eq("id", billId)
      .select()
      .single();

    if (error) throw error;

    console.log("Bills Error", error);

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        bill_id: billId,
        amount: amount.total,
        payment_type: paymentMethod,
        mpesa_code: mpesaCode,
        created_by: req.user.id,
      });

    if (paymentError) throw error;
    console.log("Payments Error", paymentError);

    res.status(200).json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bartender confirm payment
exports.confirmPayment = async (req, res) => {
  try {
    const { billId } = req.params;

    const { error } = await supabase
      .from("payments")
      .update({
        is_paid: true,
        updated_by: req.user.id,
      })
      .eq("id", billId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
