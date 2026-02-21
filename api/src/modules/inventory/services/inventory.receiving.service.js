const receiptsRepo = require("../repos/inventory.receipts.repository");
const restockService = require("../repos/inventory.adjustments.repository");
const ledgerRepo = require("../repos/inventory.ledger.repository");
const auditRepo = require("../../audit/audit.repository");

exports.getReceiptDetail = async (id) => {
  const { data, error } = await receiptsRepo.getReceiptById(id);
  if (error) throw error;
  return data;
};

exports.markReceiptPaid = async (id, context) => {
  const { data, error } = await receiptsRepo.markReceiptPaid(id);
  if (error) throw error;

  await auditRepo.log({
    entity: "inventory_receipts",
    entity_id: id,
    action: "INVENTORY_RECEIPT_PAID",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { paid_at: data.paid_at },
  });

  return data;
};

exports.receiveInventory = async (payload, context) => {
  console.log("Received payload for inventory receipt:", payload);
  if (!payload.supplier_id) throw new Error("SUPPLIER_REQUIRED");
  if (!payload.invoice_number) throw new Error("INVOICE_NUMBER_REQUIRED");
  if (!payload.purchase_date) throw new Error("PURCHASE_DATE_REQUIRED");
  if (!Array.isArray(payload.line_items) || payload.line_items.length === 0) {
    throw new Error("RECEIPT_ITEMS_REQUIRED");
  }

  const { data, error } = await receiptsRepo.receiveInventory(
    payload,
    context.userId,
  );

  if (error) {
    console.error("Error creating receipt:", error);
    throw new Error("FAILED_TO_CREATE_RECEIPT");
  }

  await auditRepo.log({
    entity: "inventory_receipts",
    entity_id: data,
    action: "INVENTORY_RECEIPT_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      supplier_id: payload.supplier_id,
      invoice_number: payload.invoice_number,
      total_amount: payload.total_amount,
      item_count: payload.line_items.length,
    },
  });

  return data;
};
