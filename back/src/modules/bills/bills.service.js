const repo = require("./bills.repository");
const auditRepo = require("../audit/audit.repository");
const inventoryService = require("../inventory/services/inventory.sale.service");
const {
  AddRoundDTO,
  CreateBillDTO,
  UpdateBillStatusDTO,
  VoidBillDTO,
} = require("./bills.dto");

/* ---------- Bills ---------- */
exports.createBill = async (payload, context) => {
  const dto = CreateBillDTO(payload);
  const { data, error } = await repo.createBill({
    customer_name: dto.customer_name,
    status: "open",
    created_by: context.userId,
  });

  if (error) throw new Error("FAILED_TO_CREATE_BILL");

  await auditRepo.log({
    entity: "bills",
    entity_id: data?.id,
    action: "BILL_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });

  return data;
};

exports.getBill = async (id) => {
  const { data, error } = await repo.findBillById(id);
  if (error || !data) throw new Error("BILL_NOT_FOUND");
  return data;
};

exports.listBills = async (filters) => {
  const { data, error } = await repo.listBills(filters);
  if (error) throw new Error("FAILED_TO_FETCH_BILLS");
  return data;
};

exports.updateStatus = async (id, payload, context) => {
  const dto = UpdateBillStatusDTO(payload);
  if (!dto.status) throw new Error("INVALID_BILL_STATUS");

  const { data, error } = await repo.updateBillStatus(
    id,
    dto.status,
    context.userId,
  );

  if (error || !data) throw new Error("FAILED_TO_UPDATE_BILL");

  await auditRepo.log({
    entity: "bills",
    entity_id: id,
    action: "BILL_STATUS_UPDATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { status: dto.status },
  });

  return data;
};

exports.voidBill = async (id, context) => {
  // dto = VoidBillDTO(payload);
  /**
   * 1. Restore inventory + ledger (Inventory module)
   */
  await inventoryService.restoreStockForBill({
    id,
    userId: context.userId,
    // reason: dto.reason,
  });

  /**
   * 2. Update bill status
   */
  const { error } = await repo.updateBillStatus(id, "void", context.userId);

  if (error) throw new Error("FAILED_TO_VOID_BILL");

  await auditRepo.log({
    entity: "bills",
    entity_id: id,
    action: "BILL_VOIDED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { reason: dto.reason },
  });

  return { id, status: "void" };
};

/* ---------- Rounds ---------- */

exports.addRound = async (billId, payload, context) => {
  const dto = AddRoundDTO(payload);

  if (!dto.items.length) {
    throw new Error("INVALID_ROUND_DATA");
  }

  /**
   * 1. Validate stock availability (Inventory module)
   */

  await inventoryService.assertStockAvailable(dto.items);

  /**
   * 2. Determine next round number
   */
  const roundNumber = await repo.getNextRoundNumber(billId);

  /**
   * 3. Create round
   */

  const { data: round, error: roundError } = await repo.createRound({
    bill_id: billId,
    round_number: roundNumber,
    created_by: context.userId,
  });

  if (roundError) throw new Error("FAILED_TO_CREATE_ROUND");

  /**
   * 4. Insert round items
   */
  const items = dto.items.map((item) => ({
    round_id: round.id,
    product_id: item.id,
    quantity: item.quantity,
    price: item.price,
  }));

  const { error: itemsError } = await repo.insertRoundItems(items);

  if (itemsError) throw new Error("FAILED_TO_ADD_ROUND_ITEMS");

  /** Stock is only updated on COmpleting the Bill Via DB Triggers */
  // /**
  //  * 5. Deduct inventory + post ledger (Inventory module)
  //  */
  // await inventoryService.consumeStockForSale({
  //   billId,
  //   items: dto.items,
  //   userId: context.userId,
  // });

  await auditRepo.log({
    entity: "rounds",
    entity_id: round.id,
    action: "ROUND_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      bill_id: billId,
      round_number: roundNumber,
      item_count: items.length,
    },
  });

  return { round, items };
};
