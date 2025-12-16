const supabase = require("../../config/supabase");

// Create a Category
exports.createCategory = async (req, res) => {
  try {
    const { name, color } = req.body;
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, color })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch categories
exports.fetchCategories = async (req, res) => {
  try {
    const { data, error } = await supabase.from("categories").select();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
