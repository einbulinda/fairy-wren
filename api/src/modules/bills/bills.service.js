const repo = require("./bills.repository");
const auditRepo = require("../audit/audit.repository");
const inventoryService = require("../inventory/services/inventory.sale.service");
const {
  AddRoundDTO,
  CreateBillDTO,
  UpdateBillStatusDTO,
  VoidBillDTO,
  ExchangeItemDTO,
} = require("./bills.dto");
const authService = require("../auth/auth.service");

// Lazy load broadcast to ensure socket server is initialized first
let broadcast;
function getBroadcast() {
  if (!broadcast) {
    broadcast = require("../../websocket/socket.server").broadcast;
  }
  return broadcast;
}

/* ---------- Bills ---------- */
exports.createBill = async (payload, context) => {
  const dto = CreateBillDTO(payload);
  const { data, error } = await repo.createBill({
    customer_name: dto.customer_name,
    status: "open",
    created_by: context.userId,
  });

  if (error) throw new Error("FAILED_TO_CREATE_BILL");

  // Broadcast bill creation to all connected clients
  try {
    getBroadcast()("bill:created", {
      bill: data,
      createdBy: context.userId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(
      "[BillsService] Failed to broadcast bill:created:",
      err.message,
    );
  }

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
  const { data, error, pagination } = await repo.listBills(filters);
  if (error) throw new Error("FAILED_TO_FETCH_BILLS");
  return { bills: data, pagination };
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
  if (reversalError) throw new Error("FAILED_TO_REVERSE_BILL_SALE");

  const { error } = await repo.updateBillStatus(id, "void", context.userId);

  if (error) throw new Error("FAILED_TO_VOID_BILL");

  // Broadcast bill void to all connected clients
  try {
    getBroadcast()("bill:voided", {
      billId: id,
      voidedBy: context.userId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(
      "[BillsService] Failed to broadcast bill:voided:",
      err.message,
    );
  }

  await auditRepo.log({
    entity: "bills",
    entity_id: id,
    action: "BILL_VOIDED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });

  return { id, status: "void" };
};

/* ---------- Item Exchange ---------- */

exports.exchangeItem = async (billId, payload, context) => {
  const dto = ExchangeItemDTO(payload);

  if (!dto.returned_item_id) throw new Error("RETURNED_ITEM_REQUIRED");
  if (!dto.returned_quantity || dto.returned_quantity < 1)
    throw new Error("INVALID_RETURNED_QUANTITY");
  if (!dto.replacement_product_id)
    throw new Error("REPLACEMENT_PRODUCT_REQUIRED");
  if (dto.replacement_quantity < 1)
    throw new Error("INVALID_REPLACEMENT_QUANTITY");
  if (dto.replacement_price < 0) throw new Error("INVALID_REPLACEMENT_PRICE");
  if (!dto.authorizer_pin) throw new Error("AUTHORIZER_PIN_REQUIRED");

  // 1. Verify PIN — check the authorizer's role has exchange_items permission
  const authorizer = await authService.verifyPinForAction(
    dto.authorizer_pin,
    "exchange_items",
  );

  // 2. Confirm bill is open
  const { data: bill, error: billError } = await repo.findBillById(billId);
  if (billError || !bill) throw new Error("BILL_NOT_FOUND");
  if (bill.status !== "open") throw new Error("BILL_NOT_OPEN");

  // 3. Validate returned item belongs to this bill and was created ≤ 6 hours ago
  const { data: roundItem, error: itemError } = await repo.findRoundItemById(
    dto.returned_item_id,
  );
  if (itemError || !roundItem) throw new Error("ROUND_ITEM_NOT_FOUND");
  if (roundItem.round.bill_id !== billId)
    throw new Error("ITEM_NOT_ON_THIS_BILL");
  if (roundItem.is_exchanged) throw new Error("ITEM_ALREADY_EXCHANGED");
  if (!roundItem.inventory_posted) throw new Error("ITEM_NOT_YET_POSTED");
  if (dto.returned_quantity > roundItem.quantity)
    throw new Error("INVALID_RETURNED_QUANTITY");

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const roundCreatedAt = new Date(roundItem.round.created_at);
  if (roundCreatedAt < sixHoursAgo) throw new Error("EXCHANGE_WINDOW_EXPIRED");

  // 4. Create an exchange round containing both the return line and the replacement line
  const roundNumber = await repo.getNextRoundNumber(billId);
  const { data: newRound, error: roundError } = await repo.createRound({
    bill_id: billId,
    round_number: roundNumber,
    created_by: context.userId,
    exchanged_by: authorizer.id,
  });
  if (roundError) throw new Error("FAILED_TO_CREATE_EXCHANGE_ROUND");

  // Return line: is_return = true, inventory_posted = true (post_round_sale skips it;
  //   inventory reversal handled separately by reverse_round_item below)
  // Replacement line: is_return = false, inventory_posted = false (post_round_sale will process it)
  const { error: insertError } = await repo.insertRoundItems([
    {
      round_id: newRound.id,
      product_id: roundItem.product_id,
      quantity: dto.returned_quantity,
      price: roundItem.price,
      is_return: true,
      inventory_posted: true,
    },
    {
      round_id: newRound.id,
      product_id: dto.replacement_product_id,
      quantity: dto.replacement_quantity,
      price: dto.replacement_price,
      is_return: false,
      inventory_posted: false,
    },
  ]);
  if (insertError) throw new Error("FAILED_TO_INSERT_EXCHANGE_ITEMS");

  // 5. Post inventory + revenue for replacement item only
  //    (post_round_sale skips items with inventory_posted = true, so return line is safe)
  const { error: saleError } = await repo.postRoundSale(newRound.id);
  if (saleError) throw new Error("FAILED_TO_POST_REPLACEMENT_SALE");

  // 6. Reverse inventory for original returned item
  const { error: reversalError } = await repo.reverseRoundItem(
    dto.returned_item_id,
    dto.returned_quantity,
  );
  console.log("ERROR", reversalError);
  if (reversalError) throw new Error("FAILED_TO_REVERSE_ITEM");

  // 7. Broadcast
  try {
    getBroadcast()("item:exchanged", {
      billId,
      returnedItemId: dto.returned_item_id,
      newRoundId: newRound.id,
      authorizedBy: authorizer.id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(
      "[BillsService] Failed to broadcast item:exchanged:",
      err.message,
    );
  }

  await auditRepo.log({
    entity: "round_items",
    entity_id: dto.returned_item_id,
    action: "ITEM_EXCHANGED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      bill_id: billId,
      returned_item_id: dto.returned_item_id,
      replacement_product_id: dto.replacement_product_id,
      replacement_price: dto.replacement_price,
      authorized_by: authorizer.id,
      authorized_by_name: authorizer.name,
    },
  });

  return { success: true, new_round_id: newRound.id };
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
   *    - Check stock for new items
   *    - Also consider items already in the bill (prevent overselling across multiple rounds)
   */
  await inventoryService.assertStockAvailableForBill(billId, dto.items);

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

  if (roundError) {
    throw new Error("FAILED_TO_CREATE_ROUND");
  }

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
  if (saleError) {
    throw new Error("FAILED_TO_POST_ROUND_SALE");
  }

  // Broadcast round creation to all connected clients
  try {
    getBroadcast()("round:created", {
      billId,
      round,
      items,
      createdBy: context.userId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(
      "[BillsService] Failed to broadcast round:created:",
      err.message,
    );
  }

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
