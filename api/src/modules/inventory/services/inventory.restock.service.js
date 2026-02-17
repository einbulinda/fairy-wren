const productsRepo = require("../repos/inventory.products.repository");
const ledgerRepo = require("../repos/inventory.ledger.repository");

exports.restock = async ({ productId, quantity, unitCost, notes }, context) => {
  if (!productId || quantity <= 0 || unitCost <= 0) {
    throw new Error("INVALID_RESTOCK_DATA");
  }

  const { data: snapshot, error } =
    await productsRepo.getProductCostSnapshot(productId);

  if (error || !snapshot) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const currentStock = Number(snapshot.current_stock);
  const currentCost = Number(snapshot.cost_price || 0);

  const newAvgCost =
    (currentStock * currentCost + quantity * unitCost) /
    (currentStock + quantity);

  const ledgerResult = await ledgerRepo.insertLedgerEntry({
    product_id: productId,
    transaction_type: "RESTOCK",
    quantity,
    unit_cost: unitCost,
    notes,
    created_by: context.userId,
  });

  if (ledgerResult.error) {
    throw new Error("FAILED_TO_RESTOCK");
  }

  const updateResult = await productsRepo.updateStockAndCost(
    productId,
    currentStock + quantity,
    newAvgCost,
  );

  if (updateResult.error) {
    throw new Error("FAILED_TO_RESTOCK");
  }

  return {
    productId,
    newStock: currentStock + quantity,
    newAvgCost,
  };
};
