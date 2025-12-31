const supabase = require("../../config/supabase");

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(*)")
      //.eq("active", true)
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
  const { payload } = req.body;
  const {
    name,
    price,
    category_id,
    stock = 0,
    image = null,
    image_url,
    image_path,
    active = true,
  } = payload;

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
    res.status(500).json({ error: error.message });
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
    const { status } = req.body;

    const { data, error } = await supabase
      .from("products")
      .update({ active: status })
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

// Restock (Add Items to existing Stock)
exports.incrementStock = async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  try {
    const { data, error } = await supabase.rpc("increment_stock", {
      product_id: productId,
      quantity: quantity,
    });

    console.log(error);

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Take Stock Take
exports.createStockTake = async (req, res) => {
  const { performedBy, performedByName, notes, items } = req.body;

  const { data: stockTake, error: stockTakeError } = await supabase
    .from("stock_takes")
    .insert({
      performed_by: performedBy,
      performed_by_name: performedByName,
      notes: notes,
    })
    .select()
    .single();

  if (stockTakeError) throw stockTakeError;

  // Add items
  const stockItems = items.map((item) => ({
    stock_take_id: stockTake.id,
    product_id: item.productId,
    product_name: item.productName,
    expected_quantity: item.expected,
    actual_quantity: item.actual,
    variance: item.actual - item.expected,
  }));

  const { error: itemsError } = await supabase
    .from("stock_take_items")
    .insert(stockItems);

  if (itemsError) throw itemsError;

  return stockTake;
};
