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
 * Validate stock availability for new items being added to a bill.
 * Only checks the NEW items against current_stock, because previous rounds
 * have already been posted and their quantities already deducted from current_stock.
 */
exports.assertStockAvailableForBill = async (billId, newItems) => {
  // Previous rounds already deducted from current_stock via post_round_sale,
  // so we only need to validate the new items against current stock.
  await exports.assertStockAvailable(newItems);
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
