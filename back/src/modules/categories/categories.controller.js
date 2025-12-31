const supabase = require("../../config/supabase");

// Create a Category
exports.createCategory = async (req, res) => {
  const { name, color } = req.body;

  try {
    const { data, error } = await supabase
      .from("categories")
      .insert({ name, color })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch categories
exports.fetchCategories = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, active");

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch Category by ID
exports.fetchCategory = async (req, res) => {
  const { categoryId } = req.params;
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, active")
      .eq("id", categoryId)
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Category Status
exports.updateCategory = async (req, res) => {
  const { categoryId } = req.params;
  const { name, color } = req.body;

  try {
    const { data, error } = await supabase
      .from("categories")
      .update({ name, color })
      .eq("id", categoryId)
      .select()
      .single();

    if (error) res.status(500).json({ error: error.message });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle Status
exports.toggleStatus = async (req, res) => {
  const { categoryId } = req.params;
  const { active } = req.body;

  try {
    const { data, error } = await supabase
      .from("categories")
      .update({ active })
      .eq("id", categoryId)
      .select()
      .single();

    if (error) res.status(500).json({ error: error.message });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
