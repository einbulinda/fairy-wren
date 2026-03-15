const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { LoginDTO } = require("./auth.dto");
const repo = require("./auth.repository");
const auditRepo = require("../audit/audit.repository");
const sessionRepo = require("./login-sessions.repository");
const { signToken } = require("../../utils/jwt");
const { getPermissionsForRole } = require("../system-roles/system-roles.service");

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
  const permissions = await getPermissionsForRole(user.role);

  const token = signToken({
    id: user.id,
    role: user.role,
    name: user.name,
    permissions,
  });

  await auditRepo.log({
    entity: "auth",
    entity_id: user.id,
    action: "LOGIN_SUCCESS",
    performed_by: user.id,
    correlation_id: context.correlationId,
  });

  // Session tracking
  await sessionRepo.endActiveSessions(user.id, "new_login");
  await sessionRepo.create({
    user_id: user.id,
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
    app: context.app,
  });

  const { data: lastSession } = await sessionRepo.getLastEndedSession(user.id);
  const lastSessionEndedAt = lastSession?.ended_at || null;

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      active: user.active,
      permissions,
    },
    lastSessionEndedAt,
  };
};

exports.me = async (user) => {
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
};

exports.updateProfile = async (userId, payload, context) => {
  const userRepo = require("../users/users.repository");

  const dto = {};
  if (payload.name !== undefined) dto.name = String(payload.name).trim();
  if (Object.keys(dto).length === 0) throw new Error("NO_FIELDS_TO_UPDATE");

  const { data, error } = await userRepo.update(userId, dto);
  if (error || !data) throw new Error("FAILED_TO_UPDATE_PROFILE");

  await auditRepo.log({
    entity: "profiles",
    entity_id: userId,
    action: "PROFILE_UPDATED",
    performed_by: userId,
    correlation_id: context.correlationId,
    metadata: { name: data.name },
  });

  const permissions = await getPermissionsForRole(data.role);
  return { id: data.id, name: data.name, role: data.role, active: data.active, permissions };
};

exports.endSession = async (userId, reason, context) => {
  await sessionRepo.endActiveSessions(userId, reason || "logout");

  await auditRepo.log({
    entity: "auth",
    entity_id: userId,
    action: "LOGOUT",
    performed_by: userId,
    correlation_id: context.correlationId,
  });
};

exports.changePin = async (userId, payload, context) => {
  const userRepo = require("../users/users.repository");

  if (!payload.currentPin || !payload.newPin)
    throw new Error("CURRENT_AND_NEW_PIN_REQUIRED");

  if (payload.newPin.length < 4)
    throw new Error("PIN_TOO_SHORT");

  // Fetch full user record with pin_hash
  const supabase = require("../../config/supabase")();
  const { data: fullUser, error: fetchErr } = await supabase
    .from("profiles")
    .select("id, pin_hash, pin_fingerprint")
    .eq("id", userId)
    .single();

  if (fetchErr || !fullUser) throw new Error("USER_NOT_FOUND");

  // Verify current PIN
  const valid = await bcrypt.compare(payload.currentPin, fullUser.pin_hash);
  if (!valid) throw new Error("INVALID_CURRENT_PIN");

  // Compute new fingerprint & hash
  const newFingerprint = crypto
    .createHmac("sha256", process.env.PIN_PEPPER)
    .update(payload.newPin)
    .digest("hex");

  // Check uniqueness
  const { data: existing } = await userRepo.userExists(newFingerprint);
  if (existing && existing.id !== userId) throw new Error("PIN_ALREADY_IN_USE");

  const newHash = await bcrypt.hash(payload.newPin, 10);

  const { error: updateErr } = await userRepo.update(userId, {
    pin_hash: newHash,
    pin_fingerprint: newFingerprint,
  });
  if (updateErr) throw new Error("FAILED_TO_CHANGE_PIN");

  await auditRepo.log({
    entity: "profiles",
    entity_id: userId,
    action: "PIN_CHANGED",
    performed_by: userId,
    correlation_id: context.correlationId,
  });

  return { success: true };
};
