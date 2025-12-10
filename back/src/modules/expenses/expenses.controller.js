const supabase = require("../../config/supabase");

// Add expense
exports.postExpense = async (req, res) => {
  try {
    const { description, amount, category, addedBy, addedByName } = req.body;

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        description,
        amount,
        category,
        added_by: addedBy,
        added_by_name: addedByName,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get expenses
exports.getExpenses = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (startDate && endDate) {
      query = query.gte("date", startDate).lte("date", endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
