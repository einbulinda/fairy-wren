const repo = require("./suppliers.repository");
const auditRepo = require("../audit/audit.repository");
const { CreateSupplierDTO, UpdateSupplierDTO } = require("./suppliers.dto");

exports.list = async () => {
  const { data, error } = await repo.findAll();
  if (error) throw new Error("FAILED_TO_FETCH_SUPPLIERS");
  return data;
};

exports.getById = async (id) => {
  const { data, error } = await repo.findById(id);
  if (error || !data) throw new Error("SUPPLIER_NOT_FOUND");
  return data;
};

exports.create = async (payload, context) => {
  if (!payload.name) {
    throw new Error("INVALID_SUPPLIER_DATA");
  }

  const dto = CreateSupplierDTO(payload);

  const { data, error } = await repo.create({
    ...dto,
    active: true,
  });

  if (error) throw new Error("FAILED_TO_CREATE_SUPPLIER");

  await auditRepo.log({
    entity: "suppliers",
    entity_id: data.id,
    action: "SUPPLIER_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { name: data.name },
  });

  return data;
};

exports.update = async (id, payload, context) => {
  const dto = UpdateSupplierDTO(payload);

  if (Object.keys(dto).length === 0) {
    throw new Error("NO_FIELDS_TO_UPDATE");
  }

  const { data, error } = await repo.update(id, dto);
  if (error || !data) throw new Error("FAILED_TO_UPDATE_SUPPLIER");

  await auditRepo.log({
    entity: "suppliers",
    entity_id: id,
    action: "SUPPLIER_UPDATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: dto,
  });

  return data;
};

exports.archive = async (id, active, context) => {
  const { error } = await repo.archive(id, active);
  if (error) throw new Error("FAILED_TO_ARCHIVE_SUPPLIER");

  await auditRepo.log({
    entity: "suppliers",
    entity_id: id,
    action: "SUPPLIER_ARCHIVED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });
};
