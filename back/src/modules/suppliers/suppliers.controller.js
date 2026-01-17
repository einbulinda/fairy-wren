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
    const { name, phone, email, contact_person, address } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Supplier name is required" });
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        name,
        phone,
        email,
        contact_person,
        address,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, supplier: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit Supplier
exports.editSupplier = async (req, res) => {
  try {
    const { name, phone, email, active } = req.body;
    const { supplierId } = req.params;

    const { error } = await supabase
      .from("suppliers")
      .update({ name, phone, email, active, updated_by: req.user.id })
      .eq("id", supplierId);

    if (error) throw error;

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
