const stockTakeRepo = require("../repos/inventory.stocktake.repository");
const readRepo = require("../repos/inventory.read.repository");
const stockTakeReadRepo = require("../repos/inventory.stocktake.read.repository");
const adjustmentsRepo = require("../repos/inventory.adjustments.repository");
const auditRepo = require("../../audit/audit.repository");

exports.createSession = async (payload, context) => {
  const { stockTakeName, stockTakeType = "full", location } = payload;

  if (!stockTakeName) {
    throw new Error("STOCK_TAKE_NAME_REQUIRED");
  }

  const { data, error } = await stockTakeRepo.createSession({
    userId: context.userId,
    stockTakeName,
    stockTakeType,
    location,
  });

  if (error) {
    throw new Error("FAILED_TO_CREATE_STOCK_TAKE");
  }

  // 🔍 AUDIT: orchestration event
  await auditRepo.log({
    entity: "stock_takes",
    entity_id: data,
    action: "STOCK_TAKE_SESSION_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      stockTakeName,
      stockTakeType,
      location,
    },
  });

  return { stockTakeId: data };
};

exports.recordItem = async (payload, context) => {
  console.log("PAYLOAD", payload);
  const { stockTakeId, productId, physicalQty, reason, notes } = payload;

  if (!stockTakeId || !productId) {
    throw new Error("INVALID_STOCK_TAKE_ITEM");
  }

  const { data, error } = await stockTakeRepo.recordItem({
    stockTakeId,
    productId,
    physicalQty,
    reason,
    notes,
  });

  if (error) {
    throw new Error("FAILED_TO_RECORD_STOCK_TAKE_ITEM");
  }
  // No audit here (high-frequency operation)
  return data;
};

exports.completeSession = async (stockTakeId, context) => {
  if (!stockTakeId) {
    throw new Error("STOCK_TAKE_ID_REQUIRED");
  }

  const { data, error } = await stockTakeRepo.completeSession(
    stockTakeId,
    context.userId,
  );

  if (error) {
    throw new Error("FAILED_TO_COMPLETE_STOCK_TAKE");
  }

  // 🔍 AUDIT: submission event
  await auditRepo.log({
    entity: "stock_takes",
    entity_id: stockTakeId,
    action: "STOCK_TAKE_SUBMITTED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });

  return data;
};

exports.approve = async (stockTakeId, { notes }, context) => {
  if (!stockTakeId) {
    throw new Error("STOCK_TAKE_ID_REQUIRED");
  }

  const { data, error } = await stockTakeRepo.approve(
    stockTakeId,
    context.userId,
    notes,
  );

  if (error) {
    console.log("Error approving stock take:", error);
    throw new Error("FAILED_TO_APPROVE_STOCK_TAKE");
  }

  // 🔍 AUDIT: approval = inventory mutation
  await auditRepo.log({
    entity: "stock_takes",
    entity_id: stockTakeId,
    action: "STOCK_TAKE_APPROVED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { notes },
  });

  return data;
};

exports.reject = async (stockTakeId, { reason }, context) => {
  if (!stockTakeId || !reason) {
    throw new Error("REJECTION_REASON_REQUIRED");
  }

  const { data, error } = await stockTakeRepo.reject(
    stockTakeId,
    context.userId,
    reason,
  );

  if (error) {
    throw new Error("FAILED_TO_REJECT_STOCK_TAKE");
  }

  await auditRepo.log({
    entity: "stock_takes",
    entity_id: stockTakeId,
    action: "STOCK_TAKE_REJECTED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { reason },
  });

  return data;
};

exports.getIncompleteSessions = async (userId) => {
  const { data, error } = await readRepo.getIncompleteStockTakes(userId);

  if (error) {
    throw new Error("FAILED_TO_FETCH_STOCK_TAKES");
  }

  return data;
};

exports.getSessionItems = async (sessionId) => {
  const { data, error } = await readRepo.getStockTakeItems(sessionId);

  if (error) {
    throw new Error("FAILED_TO_FETCH_STOCK_TAKE_ITEMS");
  }

  // Preserve v1 mapping
  return (data || []).map(({ products, ...item }) => ({
    ...item,
    product_name: products?.name ?? null,
  }));
};

exports.getAdjustmentsReport = async (filters) => {
  const { data, error } =
    await stockTakeReadRepo.getStockTakeAdjustments(filters);

  if (error) {
    console.log("Error fetching stock take adjustments:", error);
    throw new Error("FAILED_TO_FETCH_STOCK_TAKE_ADJUSTMENTS");
  }

  // Preserve v1 sort + date normalization
  return data
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((record) => ({
      ...record,
      createdAt: new Date(record.createdAt),
    }));
};
