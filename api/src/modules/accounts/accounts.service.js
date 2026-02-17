const repo = require("./accounts.repository");
const { CreateAccountDTO, UpdateAccountDTO } = require("./accounts.dto");
const auditRepo = require("../audit/audit.repository");

exports.list = async (filters) => {
  const { data, error } = await repo.findAll(filters);
  if (error) throw new Error("FAILED_TO_FETCH_ACCOUNTS");
  return data;
};

exports.getById = async (id) => {
  const { data, error } = await repo.findById(id);
  if (error || !data) throw new Error("ACCOUNT_NOT_FOUND");
  return data;
};

exports.getByCode = async (code) => {
  const { data, error } = await repo.findByCode(code);
  if (error) throw new Error("FAILED_TO_FETCH_ACCOUNT");
  return data;
};

exports.create = async (payload, context) => {
  // 1. Validate and normalize with DTO
  const dto = CreateAccountDTO(payload);

  // 2. Check if account code already exists
  const existingAccount = await exports.getByCode(dto.code);
  if (existingAccount) {
    throw new Error("ACCOUNT_CODE_ALREADY_EXISTS");
  }

  // 3. If parent_id is provided, verify it exists
  if (dto.parent_id) {
    const parentAccount = await exports.getById(dto.parent_id);
    if (!parentAccount) {
      throw new Error("PARENT_ACCOUNT_NOT_FOUND");
    }
  }

  // 4. Create the account
  const { data, error } = await repo.create(dto);

  if (error) {
    if (error.code === "23505") {
      throw new Error("ACCOUNT_CODE_ALREADY_EXISTS");
    }
    throw new Error("FAILED_TO_CREATE_ACCOUNT");
  }

  // 5. Audit log
  await auditRepo.log({
    entity: "chart_of_accounts",
    entity_id: data.id,
    action: "ACCOUNT_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { name: data.name, code: data.code, account_class: data.account_class },
  });

  return data;
};

exports.update = async (id, payload, context) => {
  // 1. Validate and normalize with DTO
  const dto = UpdateAccountDTO(payload);

  if (Object.keys(dto).length === 0) {
    throw new Error("NO_FIELDS_TO_UPDATE");
  }

  // 2. Check if account exists
  const existingAccount = await exports.getById(id);
  if (!existingAccount) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }

  // 3. If updating code, check for duplicates
  if (dto.code && dto.code !== existingAccount.code) {
    const duplicateAccount = await exports.getByCode(dto.code);
    if (duplicateAccount && duplicateAccount.id !== id) {
      throw new Error("ACCOUNT_CODE_ALREADY_EXISTS");
    }
  }

  // 4. If updating parent_id, verify it exists and prevent circular reference
  if (dto.parent_id !== undefined) {
    if (dto.parent_id === id) {
      throw new Error("ACCOUNT_CANNOT_BE_ITS_OWN_PARENT");
    }

    if (dto.parent_id) {
      const parentAccount = await exports.getById(dto.parent_id);
      if (!parentAccount) {
        throw new Error("PARENT_ACCOUNT_NOT_FOUND");
      }
    }
  }

  // 5. Update the account
  const { data, error } = await repo.update(id, dto);

  if (error || !data) {
    throw new Error("FAILED_TO_UPDATE_ACCOUNT");
  }

  // 6. Audit log
  await auditRepo.log({
    entity: "chart_of_accounts",
    entity_id: id,
    action: "ACCOUNT_UPDATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: dto,
  });

  return data;
};

exports.updateStatus = async (id, active, context) => {
  // 1. Check if account exists
  const existingAccount = await exports.getById(id);
  if (!existingAccount) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }

  // 2. Update status
  const { data, error } = await repo.updateStatus(id, active);

  if (error || !data) {
    throw new Error("FAILED_TO_UPDATE_ACCOUNT_STATUS");
  }

  // 3. Audit log
  await auditRepo.log({
    entity: "chart_of_accounts",
    entity_id: id,
    action: active ? "ACCOUNT_ACTIVATED" : "ACCOUNT_DEACTIVATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { active },
  });

  return data;
};

exports.delete = async (id, context) => {
  // 1. Check if account exists
  const existingAccount = await exports.getById(id);
  if (!existingAccount) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }

  // 2. Check if account has children
  const { data: children } = await repo.getChildren(id);
  if (children && children.length > 0) {
    throw new Error("ACCOUNT_HAS_CHILD_ACCOUNTS");
  }

  // 3. Delete the account
  const { error } = await repo.delete(id);

  if (error) {
    throw new Error("FAILED_TO_DELETE_ACCOUNT");
  }

  // 4. Audit log
  await auditRepo.log({
    entity: "chart_of_accounts",
    entity_id: id,
    action: "ACCOUNT_DELETED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { name: existingAccount.name, code: existingAccount.code },
  });
};

exports.getChildren = async (parentId) => {
  const { data, error } = await repo.getChildren(parentId);
  if (error) throw new Error("FAILED_TO_FETCH_CHILD_ACCOUNTS");
  return data || [];
};
