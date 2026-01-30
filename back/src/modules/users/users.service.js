const repo = require("./users.repository");
const { CreateUserDTO, UpdateUserDTO } = require("./users.dto");
const auditRepo = require("../audit/audit.repository");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

exports.list = async (filters) => {
  const { data, error } = await repo.findAll(filters);
  if (error) throw new Error("FAILED_TO_FETCH_USERS");
  return data;
};

exports.getById = async (id) => {
  const { data, error } = await repo.findById(id);
  if (error || !data) throw new Error("USER_NOT_FOUND");
  return data;
};

exports.create = async (payload, context) => {
  // 1. Basic validation
  if (!payload.name || !payload.pin || !payload.role)
    throw new Error("INVALID_USER_DATA");

  // 2️. DTO normalization
  const dto = CreateUserDTO(payload);

  // 2. Compute fingerprint (deterministic)
  const fingerprint = crypto
    .createHmac("sha256", process.env.PIN_PEPPER)
    .update(dto.pin)
    .digest("hex");

  // 3. Optional pre-check (UX improvement)
  const { data: existingUser } = await repo.userExists(fingerprint);
  if (existingUser) throw new Error("USER_DETAILS_EXISTS");

  // 4. Hash PIN (non-deterministic)
  const pinHash = await bcrypt.hash(dto.pin, 10);

  const { data, error } = await repo.create({
    name: dto.name,
    pin_hash: pinHash,
    pin_fingerprint: fingerprint,
    role: dto.role,
    mobile: dto.mobile,
    active: true,
  });

  // 7️. Race-condition safe handling
  if (error) {
    if (error.code === "23505") {
      throw new Error("USER_DETAILS_EXISTS");
    }
    throw new Error("FAILED_TO_CREATE_USER");
  }

  await auditRepo.log({
    entity: "profiles",
    entity_id: data.id,
    action: "CREATE",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { name: data.name, price: data.price },
  });

  return data;
};

exports.update = async (id, payload, context) => {
  const dto = UpdateUserDTO(payload);
  if (Object.keys(dto).length === 0) throw new Error("No_FIELDS_TO_UPDATE");

  const { data, error } = await repo.update(id, dto);
  if (error || !data) throw new Error("FAILED_TO_UPDATE_PRODUCT");

  await auditRepo.log({
    entity: "profiles",
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

exports.updateRole = async (id, payload, context) =>
  exports.update(id, payload, context);

exports.archive = async (id, context) => {
  const { error } = await repo.archive(id);
  if (error) throw new Error("FAILED_TO_ARCHIVE_USER");

  await auditRepo.log({
    entity: "profiles",
    entity_id: id,
    action: "ARCHIVE",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });
};
