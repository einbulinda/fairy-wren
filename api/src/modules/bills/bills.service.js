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
  /**
   * Reverse inventory movements and journal entries posted at round submission,
   * then mark bill as void.
   */
  const { error: reversalError } = await repo.reverseBillSale(id);
  console.log("Reversal error:", reversalError);
  if (reversalError) throw new Error("FAILED_TO_REVERSE_BILL_SALE");

  const { error } = await repo.updateBillStatus(id, "void", context.userId);

  if (error) throw new Error("FAILED_TO_VOID_BILL");

  await auditRepo.log({
    entity: "bills",
    entity_id: id,
    action: "BILL_VOIDED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });

  return { id, status: "void" };
};

/* ---------- Stats ---------- */
const getDateRange = (period) => {
  const now = new Date();
  let start;

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week": {
      const day = now.getDay(); // 0=Sun
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - (day === 0 ? 6 : day - 1),
      );
      break;
    }
    case "month":
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
  );
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

exports.getMyStats = async (userId, period = "month") => {
  const { startDate, endDate } = getDateRange(period);

  const { data, error } = await repo.listBillsByUser(
    userId,
    startDate,
    endDate,
  );

  if (error) throw new Error("FAILED_TO_FETCH_STATS");

  const calcValue = (bill) =>
    (bill.rounds || [])
      .flatMap((r) => r.round_items || [])
      .reduce(
        (sum, item) => sum + parseFloat(item.price) * parseInt(item.quantity),
        0,
      );

  const hasItems = (bill) =>
    (bill.rounds || []).some((r) => (r.round_items || []).length > 0);

  const stats = {
    totalBills: data.length,
    openCount: 0,
    openValue: 0,
    closedCount: 0,
    closedValue: 0,
    voidedCount: 0,
    voidedValue: 0,
  };

  for (const bill of data) {
    const value = calcValue(bill);
    if (bill.status === "open") {
      stats.openCount++;
      stats.openValue += value;
    } else if (
      bill.status === "paid" ||
      bill.status === "completed" ||
      bill.status === "closed" ||
      bill.status === "awaiting_confirmation"
    ) {
      stats.closedCount++;
      stats.closedValue += value;
    } else if (bill.status === "void" && hasItems(bill)) {
      stats.voidedCount++;
      stats.voidedValue += value;
    }
  }

  stats.openValue = parseFloat(stats.openValue.toFixed(2));
  stats.closedValue = parseFloat(stats.closedValue.toFixed(2));
  stats.voidedValue = parseFloat(stats.voidedValue.toFixed(2));

  return stats;
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

  /**
   * 5. Post inventory deduction + revenue recognition at point of service
   *    (IFRS 15.31 — revenue when control transfers; IAS 2.34 — COGS matched)
   */
  const { error: saleError } = await repo.postRoundSale(round.id);
  if (saleError) throw new Error("FAILED_TO_POST_ROUND_SALE");

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
