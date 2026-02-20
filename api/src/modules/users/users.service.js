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

  // 3. Compute fingerprint (deterministic)
  const fingerprint = crypto
    .createHmac("sha256", process.env.PIN_PEPPER)
    .update(dto.pin)
    .digest("hex");

  // 4. Optional pre-check (UX improvement)
  const { data: existingUser } = await repo.userExists(fingerprint);
  if (existingUser) throw new Error("PIN_ALREADY_IN_USE");

  // 5. Hash PIN (non-deterministic)
  const pinHash = await bcrypt.hash(dto.pin, 10);

  const { data, error } = await repo.create({
    name: dto.name,
    pin_hash: pinHash,
    pin_fingerprint: fingerprint,
    role: dto.role,
    mobile: dto.mobile,
    active: true,
  });

  // Discard plain pin
  dto.pin = undefined;

  // 6. Race-condition safe handling
  if (error) {
    if (error.code === "23505") {
      throw new Error("PIN_ALREADY_IN_USE");
    }
    throw new Error("FAILED_TO_CREATE_USER");
  }

  await auditRepo.log({
    entity: "profiles",
    entity_id: data.id,
    action: "USER_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { name: data.name, role: data.role },
  });

  return data;
};

exports.update = async (id, payload, context) => {
  const dto = UpdateUserDTO(payload);
  if (Object.keys(dto).length === 0) throw new Error("NO_FIELDS_TO_UPDATE");

  // If a new PIN is supplied, hash it and recompute the fingerprint
  if (dto.pin) {
    const fingerprint = crypto
      .createHmac("sha256", process.env.PIN_PEPPER)
      .update(dto.pin)
      .digest("hex");

    const { data: existing } = await repo.userExists(fingerprint);
    if (existing && existing.id !== id) throw new Error("PIN_ALREADY_IN_USE");

    dto.pin_hash = await bcrypt.hash(dto.pin, 10);
    dto.pin_fingerprint = fingerprint;
    delete dto.pin; // never persist raw PIN
  }

  const { data, error } = await repo.update(id, dto);
  if (error || !data) throw new Error("FAILED_TO_UPDATE_USER");

  await auditRepo.log({
    entity: "profiles",
    entity_id: id,
    action: "USER_UPDATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { name: data.name, role: data.role },
  });

  return data;
};

exports.updateStatus = async (id, active, context) => {
  if (active === false || active === "false") {
    const user = await exports.getById(id);
    if (user.role === "owner") throw new Error("CANNOT_DEACTIVATE_OWNER");
  }
  return exports.update(id, { active }, context);
};

exports.updateRole = async (id, payload, context) =>
  exports.update(id, payload, context);

exports.archive = async (id, context) => {
  const { error } = await repo.archive(id);
  if (error) throw new Error("FAILED_TO_ARCHIVE_USER");

  await auditRepo.log({
    entity: "profiles",
    entity_id: id,
    action: "USER_ARCHIVED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
  });
};
