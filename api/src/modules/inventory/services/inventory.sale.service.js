const productsRepo = require("../repos/inventory.products.repository");
const adjustmentsRepo = require("../repos/inventory.adjustments.repository");
const billsRepo = require("../repos/inventory.bills.repository");
const ledgerService = require("../../ledger/ledger.service");
const getSupabase = require("../../../config/supabase");

/**
 * Validate stock before sale with database-level consistency check
 * This prevents race conditions between multiple POS devices
 */
exports.assertStockAvailable = async (items) => {
  const supabase = getSupabase();
  const errors = [];

  // Get all product IDs
  const productIds = items.map((item) => item.id);

  // Fetch current stock for all products in a single query
  // This ensures we get a consistent snapshot
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, current_stock, track_inventory")
    .in("id", productIds);

  if (error) {
    throw new Error(`FAILED_TO_CHECK_STOCK: ${error.message}`);
  }

  // Create a map for quick lookup
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Check each item
  for (const item of items) {
    const product = productMap.get(item.id);

    if (!product) {
      errors.push(`Product not found: ${item.id}`);
      continue;
    }

    // Skip stock check for non-inventory products
    if (!product.track_inventory) {
      continue;
    }

    if (product.current_stock < item.quantity) {
      errors.push(
        `Insufficient stock for "${product.name}": Available ${product.current_stock}, Requested ${item.quantity}`
      );
    }
  }

  if (errors.length > 0) {
    const error = new Error("INSUFFICIENT_STOCK");
    error.details = errors;
    throw error;
  }
};

/**
 * Validate stock availability considering items already in the bill
 * This is important when adding multiple rounds to the same bill
 */
exports.assertStockAvailableForBill = async (billId, newItems) => {
  const supabase = getSupabase();

  // Get round IDs for this bill
  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("id")
    .eq("bill_id", billId);

  if (roundsError) {
    throw new Error(`FAILED_TO_CHECK_BILL_STOCK: ${roundsError.message}`);
  }

  const roundIds = (rounds || []).map((r) => r.id);

  // Get all existing items in the bill
  const { data: existingItems, error: billError } = roundIds.length > 0
    ? await supabase
        .from("round_items")
        .select("product_id, quantity, products!inner(name, current_stock, track_inventory)")
        .in("round_id", roundIds)
    : { data: [], error: null };

  if (billError) {
    throw new Error(`FAILED_TO_CHECK_BILL_STOCK: ${billError.message}`);
  }

  // Aggregate quantities by product
  const stockNeeded = new Map();

  // Add existing items
  for (const item of existingItems || []) {
    const current = stockNeeded.get(item.product_id) || 0;
    stockNeeded.set(item.product_id, current + item.quantity);
  }

  // Add new items
  for (const item of newItems) {
    const current = stockNeeded.get(item.id) || 0;
    stockNeeded.set(item.id, current + item.quantity);
  }

  // Check stock for all products
  const errors = [];

  for (const [productId, totalQuantity] of stockNeeded.entries()) {
    // Get current stock
    const { data: product, error } = await supabase
      .from("products")
      .select("name, current_stock, track_inventory")
      .eq("id", productId)
      .single();

    if (error) {
      errors.push(`Failed to check stock for product: ${productId}`);
      continue;
    }

    // Skip non-inventory products
    if (!product.track_inventory) {
      continue;
    }

    if (product.current_stock < totalQuantity) {
      errors.push(
        `Insufficient stock for "${product.name}": Available ${product.current_stock}, Total needed ${totalQuantity} (including items already in bill)`
      );
    }
  }

  if (errors.length > 0) {
    const error = new Error("INSUFFICIENT_STOCK");
    error.details = errors;
    throw error;
  }
};

/**
 * Deduct stock and post ledger for sale
 */
exports.consumeStockForSale = async ({ billId, items, userId }) => {
  for (const item of items) {
    await ledgerService.postBillToLedger({
      product_id: item.product_id,
      quantity: -item.quantity,
      reference_id: billId,
      created_by: userId,
    });

    await adjustmentsRepo.incrementStock(item.product_id, -item.quantity);
  }
};

/**
 * Restore stock and ledger when bill is voided
 */
exports.restoreStockForBill = async ({ billId, userId }) => {
  // 1. Get all items for this bill
  const { data: items, error } = await billsRepo.getBillItems(billId);

  if (error || !items) {
    throw new Error(
      `FAILED_TO_RESTORE_STOCK: Could not retrieve bill items: ${error?.message || "Unknown error"}`,
    );
  }

  // 2. Reverse the ledger ONCE for the entire bill
  await ledgerService.reverseBillLedger(billId, "Bill voided");

  // 3. Restore stock for each item
  for (const item of items) {
    await adjustmentsRepo.incrementStock(item.product_id, item.quantity);
  }
};
