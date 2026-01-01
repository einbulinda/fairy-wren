const supabase = require("../../config/supabase");

exports.fetchSuppliers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name", { ascending: false });

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Save a Supplier
exports.createSupplier = async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    const { error } = await supabase
      .from("suppliers")
      .insert({ name, phone, email, created_by: req.user.id });

    if (error) throw error;

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
