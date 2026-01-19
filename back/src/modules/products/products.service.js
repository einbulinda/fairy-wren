const supabase = require("../../config/supabase");
const logger = require("../../utils/logger");

/**
 * Get all products
 */
const getProducts = async () => {
  logger.info("Service:getProducts - fetching all products");

  const { data, error } = await supabase
    .from("products")
    .select("*, categories(*)")
    //.eq("active", true)
    .order("name", { ascending: false });

  if (error) {
    logger.error("Service:getProducts - failed", { error });
    throw error;
  }

  return data;
};

/**
 * Get product by ID
 */
const getProductById = async (productId) => {
  logger.info("Service:getProductById", { productId });

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error) {
    logger.error("Service:getProductById - failed", { error, productId });
    throw error;
  }

  return data;
};

/**
 * Create product
 */
const createProduct = async ({
  name,
  price,
  category_id,
  stock = 0,
  active = true,
}) => {
  logger.info("Service:createProduct", { name, price });

  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      price,
      category_id,
      current_stock: stock || 0,
      active,
    })
    .select()
    .single();

  if (error) {
    logger.error("Service:createProduct - failed", { error });
    throw error;
  }

  return data;
};

/**
 * Update product
 */
const updateProduct = async (productId, payload) => {
  logger.info("Service:updateProduct", { productId });

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    logger.error("Service:updateProduct - failed", { error, productId });
    throw error;
  }

  return data;
};

/**
 * Activate / Deactivate product
 */
const updateProductStatus = async (productId, status) => {
  logger.info("Service:updateProductStatus", { productId, status });

  const { data, error } = await supabase
    .from("products")
    .update({ active: status })
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    logger.error("Service:updateProductStatus - failed", { error });
    throw error;
  }

  return data;
};

/**
 * Update product stock
 */
const updateProductStock = async (productId, quantity) => {
  logger.info("Service:updateProductStock", { productId, quantity });

  const { data, error } = await supabase
    .from("products")
    .update({ current_stock: quantity })
    .eq("id", productId)
    .select();

  if (error) {
    logger.error("Service:updateProductStock - failed", { error });
    throw error;
  }

  return data[0];
};

/**
 * Increment stock (RPC)
 */
const incrementStock = async (productId, quantity) => {
  logger.info("Service:incrementStock", { productId, quantity });

  const { data, error } = await supabase.rpc("increment_stock", {
    product_id: productId,
    quantity: quantity,
  });

  if (error) {
    logger.error("Service:incrementStock - failed", { error });
    throw error;
  }

  return data;
};

/**
 * Stock take
 */
const createStockTake = async ({ performedBy, performedByName, items }) => {
  logger.info("Service:createStockTake", {
    performedBy,
    itemCount: items.length,
  });

  const { data, error } = await supabase
    .from("stock_takes")
    .insert({
      performed_by: performedBy,
      performed_by_name: performedByName,
    })
    .select();

  if (error) {
    logger.error("Service:createStockTake - header failed", { error });
    throw error;
  }

  const stockTake = data[0];

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

  if (itemsError) {
    logger.error("Service:createStockTake - items failed", { itemsError });
    throw itemsError;
  }

  return stockTake;
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  updateProductStock,
  incrementStock,
  createStockTake,
};
