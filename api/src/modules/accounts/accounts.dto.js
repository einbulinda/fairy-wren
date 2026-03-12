const { getActiveCodes } = require("../account-classes/account-classes.service");

const NORMAL_BALANCES = ["debit", "credit"];

exports.CreateAccountDTO = async (payload) => {
  const dto = {
    name: String(payload.name || "").trim(),
    code: String(payload.code || "").trim(),
    account_class: String(payload.account_class || "").toLowerCase(),
  };

  // Validate required fields
  if (!dto.name) throw new Error("ACCOUNT_NAME_REQUIRED");
  if (!dto.code) throw new Error("ACCOUNT_CODE_REQUIRED");
  if (!dto.account_class) throw new Error("ACCOUNT_CLASS_REQUIRED");

  // Validate account_class against DB lookup
  const validClasses = await getActiveCodes();
  if (!validClasses.includes(dto.account_class)) {
    throw new Error("INVALID_ACCOUNT_CLASS");
  }

  // Optional fields
  if (payload.parent_id !== undefined && payload.parent_id !== null) {
    dto.parent_id = String(payload.parent_id).trim();
  }

  if (payload.normal_balance !== undefined && payload.normal_balance !== null) {
    const normalBalance = String(payload.normal_balance).toLowerCase();
    if (!NORMAL_BALANCES.includes(normalBalance)) {
      throw new Error("INVALID_NORMAL_BALANCE");
    }
    dto.normal_balance = normalBalance;
  }

  if (payload.is_control_account !== undefined) {
    dto.is_control_account = Boolean(payload.is_control_account);
  }

  if (payload.active !== undefined) {
    dto.active = Boolean(payload.active);
  }

  return dto;
};

exports.UpdateAccountDTO = async (payload) => {
  const dto = {};

  if (payload.name !== undefined) {
    dto.name = String(payload.name).trim();
    if (!dto.name) throw new Error("ACCOUNT_NAME_REQUIRED");
  }

  if (payload.code !== undefined) {
    dto.code = String(payload.code).trim();
    if (!dto.code) throw new Error("ACCOUNT_CODE_REQUIRED");
  }

  if (payload.account_class !== undefined) {
    dto.account_class = String(payload.account_class).toLowerCase();
    const validClasses = await getActiveCodes();
    if (!validClasses.includes(dto.account_class)) {
      throw new Error("INVALID_ACCOUNT_CLASS");
    }
  }

  if (payload.parent_id !== undefined) {
    dto.parent_id =
      payload.parent_id === null ? null : String(payload.parent_id).trim();
  }

  if (payload.normal_balance !== undefined) {
    if (payload.normal_balance === null) {
      dto.normal_balance = null;
    } else {
      const normalBalance = String(payload.normal_balance).toLowerCase();
      if (!NORMAL_BALANCES.includes(normalBalance)) {
        throw new Error("INVALID_NORMAL_BALANCE");
      }
      dto.normal_balance = normalBalance;
    }
  }

  if (payload.is_control_account !== undefined) {
    dto.is_control_account = Boolean(payload.is_control_account);
  }

  if (payload.active !== undefined) {
    dto.active = Boolean(payload.active);
  }

  return dto;
};
