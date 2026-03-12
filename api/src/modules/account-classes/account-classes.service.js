const repo = require("./account-classes.repository");

// In-memory cache for DTO validation
let cache = null;

exports.invalidateCache = () => {
  cache = null;
};

exports.getActiveCodes = async () => {
  if (!cache) {
    const { data, error } = await repo.findActive();
    if (error) throw new Error("FAILED_TO_FETCH_ACCOUNT_CLASSES");
    cache = data.map((r) => r.code);
  }
  return cache;
};

exports.listAll = async () => {
  const { data, error } = await repo.findAll();
  if (error) throw new Error("FAILED_TO_FETCH_ACCOUNT_CLASSES");
  return data;
};

exports.create = async (payload) => {
  const code = String(payload.code || "").toLowerCase().trim();
  const label = String(payload.label || "").trim();
  const category = String(payload.category || "").toLowerCase().trim();

  if (!code) throw new Error("CODE_REQUIRED");
  if (!label) throw new Error("LABEL_REQUIRED");

  const validCategories = ["asset", "liability", "equity", "income", "expense"];
  if (!validCategories.includes(category)) throw new Error("INVALID_CATEGORY");

  const { data: existing } = await repo.findByCode(code);
  if (existing) throw new Error("CODE_ALREADY_EXISTS");

  const { data, error } = await repo.create({
    code,
    label,
    category,
    active: payload.active !== false,
    sort_order: payload.sort_order ?? 0,
  });

  if (error) throw new Error("FAILED_TO_CREATE_ACCOUNT_CLASS");
  exports.invalidateCache();
  return data;
};

exports.update = async (code, payload) => {
  const { data: existing } = await repo.findByCode(code);
  if (!existing) throw new Error("ACCOUNT_CLASS_NOT_FOUND");

  const updates = {};
  if (payload.label !== undefined) {
    updates.label = String(payload.label).trim();
    if (!updates.label) throw new Error("LABEL_REQUIRED");
  }
  if (payload.category !== undefined) {
    const validCategories = ["asset", "liability", "equity", "income", "expense"];
    updates.category = String(payload.category).toLowerCase().trim();
    if (!validCategories.includes(updates.category)) throw new Error("INVALID_CATEGORY");
  }
  if (payload.active !== undefined) updates.active = Boolean(payload.active);
  if (payload.sort_order !== undefined) updates.sort_order = Number(payload.sort_order);

  if (Object.keys(updates).length === 0) throw new Error("NO_FIELDS_TO_UPDATE");

  const { data, error } = await repo.update(code, updates);
  if (error) throw new Error("FAILED_TO_UPDATE_ACCOUNT_CLASS");
  exports.invalidateCache();
  return data;
};

exports.remove = async (code) => {
  const { data: existing } = await repo.findByCode(code);
  if (!existing) throw new Error("ACCOUNT_CLASS_NOT_FOUND");

  const inUse = await repo.isInUse(code);
  if (inUse) throw new Error("ACCOUNT_CLASS_IN_USE");

  const { error } = await repo.delete(code);
  if (error) throw new Error("FAILED_TO_DELETE_ACCOUNT_CLASS");
  exports.invalidateCache();
};
