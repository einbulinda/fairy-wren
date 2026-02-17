const inventoryRepo = require("./inventory.repository");
const ledgerService = require("../../ledger/ledger.service");
const auditRepo = require("../../audit/audit.repository");

/**
 * Manual inventory adjustment (admin only)
 * Positive qty → increase stock
 * Negative qty → decrease stock
 */

exports.adjustStock = async ({ product_id, quantity, reason }, context) => {
  if (!product_id || !quantity) {
    throw new Error("INVALID_INVENTORY_ADJUSTMENT");
  }

  // 1. Ledger entry
  await ledgerService.postBillToLedger({
    //TODO: The method called is invalid one
    product_id,
    quantity,
    reference_id: null,
    transaction_type: "ADJUSTMENT",
    created_by: context.userId,
  });

  // 2. Update stock snapshot
  await inventoryRepo.incrementStock(product_id, quantity);

  // 3. Audit log
  await auditRepo.log({
    entity: "inventory",
    entity_id: product_id,
    action: "INVENTORY_ADJUSTED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { quantity, reason },
  });

  return {
    product_id,
    quantity,
    reason,
  };
};
