const repo = require("./payroll.repository");
const {
  UpsertSalaryStructureDTO,
  CreatePayrollRunDTO,
} = require("./payroll.dto");

exports.listEmployees = async () => {
  const { data, error } = await repo.listEmployeesWithStructures();
  if (error) throw new Error("FAILED_TO_FETCH_PAYROLL_EMPLOYEES");
  return data;
};

exports.upsertSalaryStructure = async (profileId, payload, context) => {
  if (!profileId) throw new Error("INVALID_PROFILE_ID");

  const dto = UpsertSalaryStructureDTO(payload);
  if (Object.keys(dto).length === 0) throw new Error("NO_FIELDS_TO_UPDATE");

  const { data, error } = await repo.upsertSalaryStructure(profileId, dto);
  if (error || !data) throw new Error("FAILED_TO_UPSERT_SALARY_STRUCTURE");

  return data;
};

exports.processPayrollRun = async (payload, context) => {
  const dto = CreatePayrollRunDTO(payload);

  if (!dto.period) throw new Error("PAYROLL_PERIOD_REQUIRED");
  if (!dto.salary_account_id) throw new Error("SALARY_ACCOUNT_REQUIRED");
  if (!dto.payable_account_id) throw new Error("PAYABLE_ACCOUNT_REQUIRED");

  const { data, error } = await repo.processPayrollRunRpc({
    p_period: dto.period,
    p_salary_account_id: dto.salary_account_id,
    p_payable_account_id: dto.payable_account_id,
    p_notes: dto.notes,
    p_created_by: context.userId,
  });

  if (error) {
    
    if (error.message?.includes("NO_EMPLOYEES_WITH_SALARY_STRUCTURES"))
      throw new Error("NO_EMPLOYEES_WITH_SALARY_STRUCTURES");
    throw new Error("FAILED_TO_PROCESS_PAYROLL_RUN");
  }
  if (!data) throw new Error("FAILED_TO_PROCESS_PAYROLL_RUN");

  return data;
};

exports.listRuns = async () => {
  const { data, error } = await repo.listRuns();
  if (error) throw new Error("FAILED_TO_FETCH_PAYROLL_RUNS");
  return data;
};

exports.getRunDetail = async (id) => {
  const { data, error } = await repo.getRunWithLines(id);
  if (error || !data) throw new Error("PAYROLL_RUN_NOT_FOUND");
  return data;
};

exports.markRunPaid = async (id, context) => {
  const { data: existing } = await repo.getRunWithLines(id);
  if (!existing) throw new Error("PAYROLL_RUN_NOT_FOUND");
  if (existing.status !== "processed")
    throw new Error("ONLY_PROCESSED_RUNS_CAN_BE_MARKED_PAID");

  const { data, error } = await repo.markRunPaid(id);
  if (error || !data) throw new Error("FAILED_TO_MARK_RUN_PAID");
  return data;
};

exports.markLinePaid = async (lineId) => {
  if (!lineId) throw new Error("INVALID_LINE_ID");
  const { data, error } = await repo.markLinePaid(lineId);
  if (error || !data) throw new Error("FAILED_TO_MARK_LINE_PAID");
  return data;
};
