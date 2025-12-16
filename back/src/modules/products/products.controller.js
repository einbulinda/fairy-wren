const supabase = require("../../config/supabase");

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(*)")
      .eq("active", true)
      .order("name");

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Product
exports.createProduct = async (req, res) => {
  const { name, price, category_id, stock = 0, image = null } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({
      message: "Product name and price are required",
    });
  }
  try {
    const { data, error } = await supabase
      .from("products")
      .insert({
        name,
        price,
        category_id,
        stock: 0,
        image: null,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: err.message });
  }
};

// Update product stock
exports.updateProductStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const { data, error } = await supabase
      .from("products")
      .update({ stock: quantity })
      .eq("id", productId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
