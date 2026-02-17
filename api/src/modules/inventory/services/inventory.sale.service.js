const productsRepo = require("../repos/inventory.products.repository");
const adjustmentsRepo = require("../repos/inventory.adjustments.repository");
const billsRepo = require("../repos/inventory.bills.repository");
const ledgerService = require("../../ledger/ledger.service");

/**
 * Validate stock before sale
 */
exports.assertStockAvailable = async (items) => {
  for (const item of items) {
    const { data } = await productsRepo.getProductCostSnapshot(item.id); //

    if (data.current_stock < item.quantity) {
      throw new Error("INSUFFICIENT_STOCK");
    }
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
