const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { LoginDTO } = require("./auth.dto");
const repo = require("./auth.repository");
const auditRepo = require("../audit/audit.repository");
const { signToken } = require("../../utils/jwt");

exports.login = async (payload, context) => {
  if (!payload?.pin) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const dto = LoginDTO(payload);

  //Compute fingerprint
  const fingerprint = crypto
    .createHmac("sha256", process.env.PIN_PEPPER)
    .update(dto.pin)
    .digest("hex");

  const { data: user, error } =
    await repo.findActiveUserByFingerprint(fingerprint);

  // Same error for invalid user or PIN (anti-enumeration)
  if (error || !user) {
    await auditRepo.log({
      entity: "auth",
      action: "LOGIN_FAILED",
      performed_by: null,
      correlation_id: context.correlationId,
      metadata: { reason: "INVALID_PIN" },
    });

    throw new Error("INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(dto.pin, user.pin_hash);

  if (!valid) {
    await auditRepo.log({
      entity: "auth",
      action: "LOGIN_FAILED",
      performed_by: user.id,
      correlation_id: context.correlationId,
      metadata: { reason: "INVALID_PIN" },
    });

    throw new Error("INVALID_CREDENTIALS");
  }
  const token = signToken({
    id: user.id,
    role: user.role,
    name: user.name,
  });

  await auditRepo.log({
    entity: "auth",
    entity_id: user.id,
    action: "LOGIN_SUCCESS",
    performed_by: user.id,
    correlation_id: context.correlationId,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      active: user.active,
    },
  };
};

exports.me = async (user) => {
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
};
