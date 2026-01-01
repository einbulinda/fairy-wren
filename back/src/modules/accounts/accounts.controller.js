const supabase = require("../../config/supabase");

// Get Accounts
exports.getAccounts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("chart_of_accounts")
      .select("*")
      .order("type", { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create an Account
exports.createAccount = async (req, res) => {
  try {
    const { code, name, type } = req.body;

    const { error } = await supabase
      .from("chart_of_accounts")
      .insert({ code, name, type })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update an Account
exports.updateAccount = async (req, res) => {
  try {
    const { code, name, type } = req.body;
    const { accountId } = req.params;

    const { data, error } = await supabase
      .from("chart_of_accounts")
      .update({ code, name, type })
      .eq("id", accountId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    const { active } = req.body;
    const { accountId } = req.params;
    const { data, error } = await supabase
      .from("chart_of_accounts")
      .update({ active })
      .eq("id", accountId)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
