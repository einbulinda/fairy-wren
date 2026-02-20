exports.UpsertSalaryStructureDTO = (p) => {
  const dto = {};
  if (p.basic_pay !== undefined) dto.basic_pay = Number(p.basic_pay) || 0;
  if (p.housing_allowance !== undefined) dto.housing_allowance = Number(p.housing_allowance) || 0;
  if (p.transport_allowance !== undefined) dto.transport_allowance = Number(p.transport_allowance) || 0;
  if (p.other_allowances !== undefined) dto.other_allowances = Number(p.other_allowances) || 0;
  if (p.paye !== undefined) dto.paye = Number(p.paye) || 0;
  if (p.nssf !== undefined) dto.nssf = Number(p.nssf) || 0;
  if (p.shif !== undefined) dto.shif = Number(p.shif) || 0;
  if (p.housing_levy !== undefined) dto.housing_levy = Number(p.housing_levy) || 0;
  if (p.other_deductions !== undefined) dto.other_deductions = Number(p.other_deductions) || 0;
  if (p.payment_method !== undefined) dto.payment_method = p.payment_method;
  if (p.bank_name !== undefined) dto.bank_name = p.bank_name || null;
  if (p.account_number !== undefined) dto.account_number = p.account_number || null;
  if (p.mpesa_number !== undefined) dto.mpesa_number = p.mpesa_number || null;
  if (p.full_name !== undefined) dto.full_name = p.full_name || null;
  if (p.id_number !== undefined) dto.id_number = p.id_number || null;
  if (p.date_of_employment !== undefined) dto.date_of_employment = p.date_of_employment || null;
  return dto;
};

exports.CreatePayrollRunDTO = (p) => ({
  period: p.period,
  salary_account_id: p.salary_account_id,
  payable_account_id: p.payable_account_id,
  notes: p.notes || null,
});
