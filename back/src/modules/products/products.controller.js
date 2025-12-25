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

// Get product by ID
exports.getProductById = async (req, res) => {
  const { productId } = req.params;
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Product
exports.createProduct = async (req, res) => {
  const {
    name,
    price,
    category_id,
    stock = 0,
    image = null,
    image_url,
    image_path,
    active = true,
  } = req.body;

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
        stock: stock || 0,
        image: image || "📦",
        image_url: image_url || null,
        image_path: image_path || null,
        active,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: err.message });
  }
};

// Update Product
exports.updateProduct = async (req, res) => {
  const { productId } = req.params;
  const { name, price, category_id, image_url, image_path, stock } = req.body;

  try {
    const { data, error } = await supabase
      .from("products")
      .update({
        name,
        price,
        category_id,
        image_url,
        image_path,
        stock,
      })
      .eq("id", productId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Deactivate Product
exports.deactivateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { active } = req.body;

    const { data, error } = await supabase
      .from("products")
      .update({ active: active })
      .eq("id", productId)
      .select()
      .single();
    if (error) throw error;

    res.json(data);
  } catch (err) {
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
