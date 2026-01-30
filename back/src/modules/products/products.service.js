const repo = require("./products.repository");
const { CreateProductDTO, UpdateProductDTO } = require("./products.dto");
const auditRepo = require("../audit/audit.repository");

exports.list = async (filters) => {
  const { data, error } = await repo.findAll(filters);
  if (error) throw new Error("FAILED_TO_FETCH_PRODUCTS");
  return data;
};

exports.getById = async (id) => {
  const { data, error } = await repo.findById(id);
  if (error || !data) throw new Error("PRODUCT_NOT_FOUND");
  return data;
};

exports.create = async (payload, context) => {
  if (!payload?.name || payload.price === undefined)
    throw new Error("INVALID_PRODUCT_DATA");

  const dto = CreateProductDTO(payload);
  const { data, error } = await repo.create(dto);

  if (error) throw new Error("FAILED_TO_CREATE_PRODUCT");

  await auditRepo.log({
    entity: "product",
    entity_id: data.id,
    action: "CREATE",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { name: data.name, price: data.price },
  });

  return data;
};

exports.update = async (id, payload, context) => {
  const dto = UpdateProductDTO(payload);
  if (Object.keys(dto).length === 0) throw new Error("NO_FIELDS_TO_UPDATE");

  const { data, error } = await repo.update(id, dto);
  if (error || !data) throw new Error("FAILED_TO_UPDATE_PRODUCT");

  await auditRepo.log({
    entity: "product",
    entity_id: id,
    action: "UPDATE",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: dto,
  });

  return data;
};

exports.updateStatus = async (id, active, context) =>
  exports.update(id, { active }, context);

exports.archive = async (id, context) => {
  const { error } = await repo.archive(id);
  if (error) throw new Error("FAILED_TO_ARCHIVE_PRODUCT");

  await auditRepo.log({
    entity: "product",
    entity_id: id,
    action: "ARCHIVE",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });
};
