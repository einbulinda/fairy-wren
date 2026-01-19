const productService = require("./products.service");
const logger = require("../../utils/logger");

/**
 * Get all products
 */
exports.getProducts = async (req, res) => {
  try {
    const data = await productService.getProducts();
    return res.status(200).json(data);
  } catch (err) {
    logger.error("Controller:getProducts failed", { error: err.message });
    return res.status(500).json({ message: "Failed to fetch products" });
  }
};

/**
 * Get product by ID
 */
exports.getProductById = async (req, res) => {
  const { productId } = req.params;

  try {
    const data = await productService.getProductById(productId);
    return res.status(200).json(data);
  } catch (err) {
    logger.error("Controller:getProductById failed", { error: err.message });
    return res.status(404).json({ message: "Product not found" });
  }
};

/**
 * Create product
 */
exports.createProduct = async (req, res) => {
  const { payload } = req.body;

  if (!payload?.name) {
    return res.status(400).json({ message: "Product name is required" });
  }

  if (payload.price === undefined) {
    return res.status(400).json({ message: "Product price is required" });
  }

  try {
    const data = await productService.createProduct(payload);
    return res.status(201).json(data);
  } catch (err) {
    logger.error("Controller:createProduct failed", { error: err.message });
    return res.status(500).json({ message: "Failed to create product" });
  }
};

/**
 * Update product
 */
exports.updateProduct = async (req, res) => {
  const { productId } = req.params;

  try {
    const data = await productService.updateProduct(productId, req.body);
    return res.status(200).json(data);
  } catch (err) {
    logger.error("Controller:updateProduct failed", { error: err.message });
    return res.status(500).json({ message: "Failed to update product" });
  }
};

/**
 * Activate / Deactivate product
 */
exports.deactivateProduct = async (req, res) => {
  const { productId } = req.params;
  const { status } = req.body;

  try {
    const data = await productService.updateProductStatus(productId, status);
    return res.status(200).json(data);
  } catch (err) {
    logger.error("Controller:deactivateProduct failed", { error: err.message });
    return res.status(500).json({ message: "Failed to update product status" });
  }
};

/**
 * Update stock
 */
exports.updateProductStock = async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  try {
    const data = await productService.updateProductStock(productId, quantity);
    return res.status(200).json(data);
  } catch (err) {
    logger.error("Controller:updateProductStock failed", {
      error: err.message,
    });
    return res.status(500).json({ message: "Failed to update stock" });
  }
};

/**
 * Increment stock
 */
exports.incrementStock = async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  try {
    const data = await productService.incrementStock(productId, quantity);
    return res.status(200).json(data);
  } catch (err) {
    logger.error("Controller:incrementStock failed", { error: err.message });
    return res.status(500).json({ message: "Failed to increment stock" });
  }
};
