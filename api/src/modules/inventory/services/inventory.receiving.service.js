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
  const {
    supplier_id,
    invoice_number,
    purchase_date,
    total_amount,
    line_items,
  } = payload;

  if (!supplier_id) throw new Error("SUPPLIER_REQUIRED");
  if (!invoice_number) throw new Error("INVOICE_NUMBER_REQUIRED");
  if (!purchase_date) throw new Error("PURCHASE_DATE_REQUIRED");
  if (!Array.isArray(line_items) || line_items.length === 0) {
    throw new Error("RECEIPT_ITEMS_REQUIRED");
  }

  const { data: receipt, error } = await receiptsRepo.createReceipt({
    supplier_id,
    invoice_number,
    purchase_date,
    total_amount,
    created_by: context.userId,
  });

  if (error) {
    throw new Error("FAILED_TO_CREATE_RECEIPT");
  }

  const receiptItems = line_items.map((item) => ({
    receipt_id: receipt.id,
    product_id: item.product_id,
    quantity: Number(item.quantity),
    unit_cost: Number(item.cost_price),
    line_total: Number(item.quantity) * Number(item.cost_price),
  }));

  const itemsResult = await receiptsRepo.createReceiptItems(receiptItems);

  if (itemsResult.error) {
    throw new Error("FAILED_TO_CREATE_RECEIPT_ITEMS");
  }

  for (const item of line_items) {
    await restockService.incrementStock(item.product_id, Number(item.quantity));

    await ledgerRepo.insertLedgerEntry({
      product_id: item.product_id,
      transaction_type: "RESTOCK",
      quantity: Number(item.quantity),
      reference_id: receipt.id,
      notes: `Receipt ${invoice_number}`,
      created_by: context.userId,
      unit_cost: Number(item.cost_price),
    });
  }

  await auditRepo.log({
    entity: "inventory_receipts",
    entity_id: receipt.id,
    action: "INVENTORY_RECEIPT_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      supplier_id,
      invoice_number,
      total_amount,
      item_count: line_items.length,
    },
  });

  return receipt;
};
