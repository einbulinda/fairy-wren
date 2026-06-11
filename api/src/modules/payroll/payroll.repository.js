const pool = require("../../config/db");

exports.listEmployeesWithStructures = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.role,
              json_agg(
                CASE WHEN ess.id IS NOT NULL THEN
                  json_build_object(
                    'id', ess.id,
                    'basic_pay', ess.basic_pay,
                    'housing_allowance', ess.housing_allowance,
                    'transport_allowance', ess.transport_allowance,
                    'other_allowances', ess.other_allowances,
                    'paye', ess.paye,
                    'nssf', ess.nssf,
                    'shif', ess.shif,
                    'housing_levy', ess.housing_levy,
                    'other_deductions', ess.other_deductions,
                    'payment_method', ess.payment_method,
                    'bank_name', ess.bank_name,
                    'account_number', ess.account_number,
                    'mpesa_number', ess.mpesa_number,
                    'full_name', ess.full_name,
                    'id_number', ess.id_number,
                    'date_of_employment', ess.date_of_employment
                  )
                ELSE NULL END
              ) FILTER (WHERE ess.id IS NOT NULL) AS employee_salary_structures
       FROM profiles p
       LEFT JOIN employee_salary_structures ess ON ess.profile_id = p.id
       GROUP BY p.id, p.name, p.role
       ORDER BY p.name`,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.upsertSalaryStructure = async (profileId, payload) => {
  try {
    const data = { profile_id: profileId, ...payload, updated_at: new Date().toISOString() };
    const cols = Object.keys(data);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const updateSet = cols
      .filter((c) => c !== "profile_id")
      .map((c) => `"${c}" = EXCLUDED."${c}"`)
      .join(", ");
    const { rows } = await pool.query(
      `INSERT INTO employee_salary_structures (${cols.join(", ")}) VALUES (${placeholders})
       ON CONFLICT (profile_id) DO UPDATE SET ${updateSet}
       RETURNING *`,
      Object.values(data),
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.processPayrollRunRpc = async (params) => {
  try {
    const keys = Object.keys(params);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const { rows } = await pool.query(
      `SELECT * FROM rpc_process_payroll_run(${placeholders})`,
      Object.values(params),
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.listRuns = async () => {
  try {
    const { rows } = await pool.query(
      `SELECT id, period, status, total_gross, total_deductions, total_net,
              employee_count, notes, processed_at, paid_at, created_at
       FROM payroll_runs
       ORDER BY period DESC`,
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.getRunWithLines = async (id) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         pr.id, pr.period, pr.status, pr.total_gross, pr.total_deductions, pr.total_net,
         pr.employee_count, pr.salary_account_id, pr.payable_account_id, pr.journal_entry_id,
         pr.notes, pr.processed_at, pr.paid_at, pr.created_at,
         COALESCE(
           json_agg(
             json_build_object(
               'id', prl.id,
               'basic_pay', prl.basic_pay,
               'housing_allowance', prl.housing_allowance,
               'transport_allowance', prl.transport_allowance,
               'other_allowances', prl.other_allowances,
               'gross_pay', prl.gross_pay,
               'paye', prl.paye,
               'nssf', prl.nssf,
               'shif', prl.shif,
               'housing_levy', prl.housing_levy,
               'other_deductions', prl.other_deductions,
               'total_deductions', prl.total_deductions,
               'net_pay', prl.net_pay,
               'payment_method', prl.payment_method,
               'full_name', prl.full_name,
               'id_number', prl.id_number,
               'mpesa_number', prl.mpesa_number,
               'is_paid', prl.is_paid,
               'paid_at', prl.paid_at,
               'profiles', json_build_object('id', p.id, 'name', p.name, 'role', p.role)
             ) ORDER BY prl.id
           ) FILTER (WHERE prl.id IS NOT NULL),
           '[]'::json
         ) AS payroll_run_lines
       FROM payroll_runs pr
       LEFT JOIN payroll_run_lines prl ON prl.payroll_run_id = pr.id
       LEFT JOIN profiles p ON p.id = prl.profile_id
       WHERE pr.id = $1
       GROUP BY pr.id`,
      [id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.markRunPaid = async (id) => {
  try {
    const { rows } = await pool.query(
      `UPDATE payroll_runs SET status = $1, paid_at = $2 WHERE id = $3 RETURNING *`,
      ["paid", new Date().toISOString(), id],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

exports.markLinePaid = async (lineId) => {
  try {
    const { rows } = await pool.query(
      `UPDATE payroll_run_lines SET is_paid = true, paid_at = $1 WHERE id = $2 RETURNING *`,
      [new Date().toISOString(), lineId],
    );
    return { data: rows[0] || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
