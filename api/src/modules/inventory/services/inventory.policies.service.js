const policiesRepo = require("../repos/inventory.policies.repository");

/* ---------- POLICIES ---------- */

exports.getPolicies = async () => {
  const { data, error } = await policiesRepo.getAllPolicies();
  if (error) throw new Error("FAILED_TO_FETCH_REORDER_POLICIES");
  return data;
};

exports.getPolicy = async (productId) => {
  if (!productId) throw new Error("PRODUCT_NOT_FOUND");
  const { data, error } = await policiesRepo.getPolicyByProductId(productId);
  if (error) throw new Error("FAILED_TO_FETCH_REORDER_POLICIES");
  return data;
};

exports.setManualOverride = async (productId, reorderLevel) => {
  if (!productId) throw new Error("PRODUCT_NOT_FOUND");
  if (
    reorderLevel === undefined ||
    reorderLevel === null ||
    Number(reorderLevel) < 0
  ) {
    throw new Error("INVALID_REORDER_LEVEL");
  }

  const { data, error } = await policiesRepo.upsertManualOverride(
    productId,
    Number(reorderLevel),
  );
  if (error) throw new Error("FAILED_TO_SET_MANUAL_OVERRIDE");
  return data;
};

exports.clearOverride = async (productId) => {
  if (!productId) throw new Error("PRODUCT_NOT_FOUND");
  const { data, error } = await policiesRepo.resetOverride(productId);
  if (error) throw new Error("FAILED_TO_CLEAR_OVERRIDE");
  return data;
};

/* ---------- SETTINGS ---------- */

exports.getSettings = async () => {
  const { data, error } = await policiesRepo.getSettings();
  if (error) throw new Error("FAILED_TO_FETCH_REORDER_SETTINGS");
  return data;
};

exports.updateSettings = async (payload) => {
  const allowed = {};
  if (payload.default_service_level !== undefined) {
    const sl = Number(payload.default_service_level);
    if (sl < 0.5 || sl > 0.999) throw new Error("INVALID_SERVICE_LEVEL");
    allowed.default_service_level = sl;
  }
  if (payload.default_lookback_days !== undefined) {
    const lb = Number(payload.default_lookback_days);
    if (lb < 7 || lb > 365) throw new Error("INVALID_LOOKBACK_DAYS");
    allowed.default_lookback_days = lb;
  }
  if (payload.default_lead_time_days !== undefined) {
    const lt = Number(payload.default_lead_time_days);
    if (lt < 1 || lt > 90) throw new Error("INVALID_LEAD_TIME");
    allowed.default_lead_time_days = lt;
  }
  if (payload.default_reorder_level !== undefined) {
    const rl = Number(payload.default_reorder_level);
    if (rl < 0) throw new Error("INVALID_REORDER_LEVEL");
    allowed.default_reorder_level = rl;
  }
  if (payload.auto_refresh_enabled !== undefined) {
    allowed.auto_refresh_enabled = Boolean(payload.auto_refresh_enabled);
  }
  if (payload.fast_moving_days !== undefined) {
    const fd = Number(payload.fast_moving_days);
    if (fd < 1 || fd > 365) throw new Error("INVALID_MOVEMENT_DAYS");
    allowed.fast_moving_days = fd;
  }
  if (payload.slow_moving_days !== undefined) {
    const sd = Number(payload.slow_moving_days);
    if (sd < 1 || sd > 730) throw new Error("INVALID_MOVEMENT_DAYS");
    allowed.slow_moving_days = sd;
  }

  if (Object.keys(allowed).length === 0) throw new Error("NO_FIELDS_TO_UPDATE");

  const { data, error } = await policiesRepo.updateSettings(allowed);
  if (error) throw new Error("FAILED_TO_UPDATE_REORDER_SETTINGS");
  return data;
};

/* ---------- MOVEMENT ANALYSIS ---------- */

exports.getMovementAnalysis = async () => {
  // Fetch thresholds from settings
  const { data: settings } = await policiesRepo.getSettings();
  const fastDays = settings?.fast_moving_days ?? 30;
  const slowDays = settings?.slow_moving_days ?? 90;

  const { data, error } = await policiesRepo.getMovementAnalysis(fastDays, slowDays);
  if (error) throw new Error("FAILED_TO_FETCH_MOVEMENT_ANALYSIS");
  return data;
};

/* ---------- REFRESH ---------- */

exports.triggerRefresh = async (productIds) => {
  const repo = productIds
    ? policiesRepo.refreshProduct(productIds)
    : policiesRepo.refreshAll();

  const { data, error } = await repo;
  console.log("Error on Refresh,", error);
  if (error) throw new Error("FAILED_TO_REFRESH_REORDER_LEVELS");
  return data;
};

/* ---------- ALERTS ---------- */

exports.getReorderAlerts = async () => {
  const { data, error } = await policiesRepo.getReorderAlerts();
  if (error) throw new Error("FAILED_TO_FETCH_REORDER_ALERTS");
  return data;
};
