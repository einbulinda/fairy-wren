const repo = require("./exchanges.repository");
const auditRepo = require("../audit/audit.repository");

exports.listPartners = async (query = {}) => {
  return repo.listPartners(query);
};

exports.createPartner = async (payload, context) => {
  if (!payload.name?.trim()) throw new Error("PARTNER_NAME_REQUIRED");

  const partner = await repo.createPartner({
    name: payload.name.trim(),
    contact_person: payload.contact_person,
    phone: payload.phone,
    notes: payload.notes,
  });

  await auditRepo.log({
    entity: "business_partners",
    entity_id: partner.id,
    action: "BUSINESS_PARTNER_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { name: partner.name },
  });

  return partner;
};

exports.createExchange = async (payload, context) => {
  if (!payload.partner_id) throw new Error("PARTNER_REQUIRED");
  if (!payload.direction || !["outbound", "inbound"].includes(payload.direction)) {
    throw new Error("INVALID_DIRECTION");
  }
  if (!Array.isArray(payload.line_items) || payload.line_items.length === 0) {
    throw new Error("EXCHANGE_ITEMS_REQUIRED");
  }

  // Determine approval status:
  // - owners always auto-approve
  // - users with both manage_exchanges + approve_exchanges auto-approve
  // - everyone else → pending
  const isOwner = context.role === "owner";
  const perms = context.permissions || [];
  const canAutoApprove =
    isOwner ||
    (perms.includes("manage_exchanges") && perms.includes("approve_exchanges"));

  const approvalStatus = canAutoApprove ? "approved" : "pending";

  const data = await repo.createExchange(payload, context.userId, approvalStatus);

  await auditRepo.log({
    entity: "product_exchanges",
    entity_id: data,
    action: "EXCHANGE_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      partner_id: payload.partner_id,
      direction: payload.direction,
      item_count: payload.line_items.length,
      approval_status: approvalStatus,
    },
  });

  return { id: data, approval_status: approvalStatus };
};

exports.getExchangeDetail = async (id) => {
  return repo.getExchangeById(id);
};

exports.getAllExchanges = async (query = {}) => {
  return repo.getAllExchanges(query);
};

exports.getPendingExchanges = async () => {
  return repo.getPendingExchanges();
};

exports.approveExchange = async (id, context) => {
  await repo.approveExchange(id, context.userId);

  await auditRepo.log({
    entity: "product_exchanges",
    entity_id: id,
    action: "EXCHANGE_APPROVED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });

  return { id };
};

exports.rejectExchange = async (id, payload, context) => {
  await repo.rejectExchange(id, context.userId, payload.reason);

  await auditRepo.log({
    entity: "product_exchanges",
    entity_id: id,
    action: "EXCHANGE_REJECTED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { reason: payload.reason },
  });

  return { id };
};
