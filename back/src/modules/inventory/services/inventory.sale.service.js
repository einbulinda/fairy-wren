const productsRepo = require("../repos/inventory.products.repository");
const adjustmentsRepo = require("../repos/inventory.adjustments.repository");
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
  const { data: items } = await repo.getBillItems(billId);

  for (const item of items) {
    await ledgerService.reverseBillLedger(billId, "Bill voided");

    await repo.incrementStock(item.product_id, item.quantity);
  }
};
