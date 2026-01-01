const supabase = require("../../config/supabase");

exports.getExpense = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select(
        `
        *,
        suppliers(name),
        chart_of_accounts(name, code)
      `
      )
      .order("expense_date", { ascending: false });

    console.log("Error", error);

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const {
      expense_date,
      supplier_id,
      account_id,
      description,
      invoice_number,
      amount,
    } = req.body;

    if (!expense_date || !account_id || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { error } = await supabase.from("expenses").insert([
      {
        expense_date,
        supplier_id,
        account_id,
        description,
        invoice_number,
        amount,
        created_by: req.user.id,
      },
    ]);

    if (error) throw error;
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
