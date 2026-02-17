const repo = require("./categories.repository");
const auditRepo = require("../audit/audit.repository");
const { CreateCategoryDTO, UpdateCategoryDTO } = require("./categories.dto");

exports.list = async (filters) => {
  const { data, error } = await repo.findAll(filters);
  if (error) throw new Error("FAILED_TO_FETCH_CATEGORIES");
  return data;
};

exports.getById = async (id) => {
  const { data, error } = await repo.findById(id);
  if (error || !data) throw new Error("CATEGORY_NOT_FOUND");
  return data;
};

exports.create = async (payload, context) => {
  if (!payload.name) {
    throw new Error("INVALID_CATEGORY_DATA");
  }

  const dto = CreateCategoryDTO(payload);

  const { data, error } = await repo.create({
    ...dto,
    archived: false,
  });

  if (error) throw new Error("FAILED_TO_CREATE_CATEGORY");

  await auditRepo.log({
    entity: "categories",
    entity_id: data.id,
    action: "CATEGORY_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { name: data.name },
  });

  return data;
};

exports.update = async (id, payload, context) => {
  const dto = UpdateCategoryDTO(payload);

  if (Object.keys(dto).length === 0) {
    throw new Error("NO_FIELDS_TO_UPDATE");
  }

  const { data, error } = await repo.update(id, dto);
  if (error || !data) throw new Error("FAILED_TO_UPDATE_CATEGORY");

  await auditRepo.log({
    entity: "categories",
    entity_id: id,
    action: "CATEGORY_UPDATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: dto,
  });

  return data;
};

exports.archive = async (id, active, context) => {
  const { error } = await repo.archive(id, active);
  if (error) throw new Error("FAILED_TO_ARCHIVE_CATEGORY");

  await auditRepo.log({
    entity: "categories",
    entity_id: id,
    action: "CATEGORY_ARCHIVED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });
};
