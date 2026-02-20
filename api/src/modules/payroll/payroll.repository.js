const getSupabase = require("../../config/supabase");

exports.listEmployeesWithStructures = async () => {
  const supabase = getSupabase();
  return supabase
    .from("profiles")
    .select(`
      id, name, role,
      employee_salary_structures(
        id, basic_pay, housing_allowance, transport_allowance, other_allowances,
        paye, nssf, shif, housing_levy, other_deductions,
        payment_method, bank_name, account_number, mpesa_number,
        full_name, id_number, date_of_employment
      )
    `)
    .order("name");
};

exports.upsertSalaryStructure = async (profileId, payload) => {
  const supabase = getSupabase();
  return supabase
    .from("employee_salary_structures")
    .upsert(
      { profile_id: profileId, ...payload, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" }
    )
    .select()
    .single();
};

exports.processPayrollRunRpc = async (params) => {
  const supabase = getSupabase();
  return supabase.rpc("rpc_process_payroll_run", params);
};

exports.listRuns = async () => {
  const supabase = getSupabase();
  return supabase
    .from("payroll_runs")
    .select("id, period, status, total_gross, total_deductions, total_net, employee_count, notes, processed_at, paid_at, created_at")
    .order("period", { ascending: false });
};

exports.getRunWithLines = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("payroll_runs")
    .select(`
      id, period, status, total_gross, total_deductions, total_net,
      employee_count, salary_account_id, payable_account_id, journal_entry_id,
      notes, processed_at, paid_at, created_at,
      payroll_run_lines(
        id, basic_pay, housing_allowance, transport_allowance, other_allowances,
        gross_pay, paye, nssf, shif, housing_levy, other_deductions, total_deductions, net_pay,
        payment_method, full_name, id_number, mpesa_number, is_paid, paid_at,
        profiles(id, name, role)
      )
    `)
    .eq("id", id)
    .single();
};

exports.markRunPaid = async (id) => {
  const supabase = getSupabase();
  return supabase
    .from("payroll_runs")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
};

exports.markLinePaid = async (lineId) => {
  const supabase = getSupabase();
  return supabase
    .from("payroll_run_lines")
    .update({ is_paid: true, paid_at: new Date().toISOString() })
    .eq("id", lineId)
    .select()
    .single();
};
