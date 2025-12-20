const supabase = require("../../config/supabase");

// Create a new bill
exports.createBill = async (req, res) => {
  try {
    const { customerName, waitressId, waitressName } = req.body;
    const { data, error } = await supabase
      .from("bills")
      .insert({
        customer_name: customerName,
        waitress_id: waitressId,
        waitress_name: waitressName,
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
    const { roundNumber, items, addedBy } = req.body;

    //Create Round
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        bill_id: billId,
        round_number: roundNumber,
        added_by: addedBy,
      })
      .select()
      .single();

    if (roundError) throw roundError;

    // Add Items to Round
    const roundItems = items.map((item) => ({
      round_id: round.id,
      product_id: item.productId,
      product_name: item.productName,
      price: item.price,
      quantity: item.quantity,
    }));

    console.log("Inserting round items:", roundItems);

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
      .eq("status", "open")
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
    const { paymentMethod, mpesaCode, markedBy } = req.body;

    const { data, error } = await supabase
      .from("bills")
      .update({
        status: "awaiting_confirmation",
        payment_method: paymentMethod,
        mpesa_code: mpesaCode,
        marked_paid_at: new Date().toISOString(),
        marked_paid_by: markedBy,
      })
      .eq("id", billId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: err.message });
  }
};

// Bartender confirm payment
exports.confirmPayment = async (req, res) => {
  try {
    const { billId } = req.params;
    const { confirmedBy } = req.body;

    const { data, error } = await supabase
      .from("bills")
      .update({
        status: "completed",
        confirmed_at: new Date().toISOString(),
        confirmed_by: confirmedBy,
      })
      .eq("id", billId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: err.message });
  }
};
