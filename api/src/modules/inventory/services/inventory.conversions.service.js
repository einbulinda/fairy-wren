const conversionsRepo = require("../repos/inventory.conversions.repository");
const policiesRepo = require("../repos/inventory.policies.repository");

exports.executeConversion = async (payload, context) => {
  const {
    source_product_id,
    target_product_id,
    source_qty,
    target_qty,
    notes,
  } = payload;

  if (!source_product_id || !target_product_id)
    throw new Error("CONVERSION_PRODUCTS_REQUIRED");
  if (source_product_id === target_product_id)
    throw new Error("CONVERSION_SAME_PRODUCT");
  if (!source_qty || source_qty <= 0) throw new Error("INVALID_CONVERSION_QTY");
  if (!target_qty || target_qty <= 0) throw new Error("INVALID_CONVERSION_QTY");

  const { data, error } = await conversionsRepo.executeConversion({
    sourceProductId: source_product_id,
    targetProductId: target_product_id,
    sourceQty: source_qty,
    targetQty: target_qty,
    notes,
    userId: context?.userId,
  });

  if (error) {
    if (error.message?.includes("Insufficient stock"))
      throw new Error("INSUFFICIENT_STOCK");

    console.log("Conversion error", error);
    throw new Error("FAILED_TO_EXECUTE_CONVERSION");
  }

  return data;
};

exports.getConversionHistory = async () => {
  const { data, error } = await conversionsRepo.getConversionHistory();
  if (error) {
    console.log("Conversion Fetch Error:", error);
    throw new Error("FAILED_TO_FETCH_CONVERSIONS");
  }
  return data;
};

exports.getConvertibleProducts = async () => {
  const { data: settings } = await policiesRepo.getSettings();
  const allowedCategories = settings?.conversion_allowed_categories ?? [];

  const { data, error } =
    await conversionsRepo.getConvertibleProducts(allowedCategories);
  if (error) throw new Error("FAILED_TO_FETCH_CONVERTIBLE_PRODUCTS");
  return data;
};

exports.getTotSize = async () => {
  const { data, error } = await policiesRepo.getSettings();
  if (error) throw new Error("FAILED_TO_FETCH_REORDER_SETTINGS");
  return { default_tot_size_ml: data?.default_tot_size_ml ?? 30 };
};
