import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Play,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Edit2,
  Briefcase,
} from "lucide-react";
import {
  usePayrollEmployees,
  useUpsertSalaryStructure,
  usePayrollRuns,
  useProcessPayrollRun,
  usePayrollRunDetail,
  useMarkRunPaid,
} from "@/hooks/usePayroll";
import { fetchAccounts } from "@/services/accounts.service";

const fmt = (n) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(n ?? 0);

const fmtPeriod = (period) => {
  if (!period) return "—";
  const d = new Date(period);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
};

const inputCls =
  "w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

const labelCls = "block text-xs font-medium text-surface-400 mb-1";

const EMPTY_SALARY = {
  basic_pay: "",
  housing_allowance: "",
  transport_allowance: "",
  other_allowances: "",
  paye: "",
  nssf: "",
  shif: "",
  housing_levy: "",
  other_deductions: "",
  payment_method: "cash",
  bank_name: "",
  account_number: "",
};

// Supabase returns employee_salary_structures as a single object (not array)
// when the FK has a UNIQUE constraint. Handle both cases defensively.
const getStruct = (emp) => {
  const s = emp?.employee_salary_structures;
  return Array.isArray(s) ? (s[0] ?? null) : (s ?? null);
};

const TABS = [
  { id: "employees", label: "Employees", icon: Users },
  { id: "runs", label: "Payroll Runs", icon: Briefcase },
];

const StatusBadge = ({ status }) => {
  const map = {
    draft: "bg-surface-700 text-surface-300",
    processed: "bg-blue-500/20 text-blue-400",
    paid: "bg-emerald-500/20 text-emerald-400",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? "bg-surface-700 text-surface-300"}`}
    >
      {status}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Salary Form Panel
// ---------------------------------------------------------------------------
const SalaryPanel = ({ employee, onClose }) => {
  const existing = getStruct(employee);
  const [form, setForm] = useState(
    existing
      ? {
          basic_pay: existing.basic_pay ?? "",
          housing_allowance: existing.housing_allowance ?? "",
          transport_allowance: existing.transport_allowance ?? "",
          other_allowances: existing.other_allowances ?? "",
          paye: existing.paye ?? "",
          nssf: existing.nssf ?? "",
          shif: existing.shif ?? "",
          housing_levy: existing.housing_levy ?? "",
          other_deductions: existing.other_deductions ?? "",
          payment_method: existing.payment_method ?? "cash",
          bank_name: existing.bank_name ?? "",
          account_number: existing.account_number ?? "",
        }
      : EMPTY_SALARY,
  );

  const upsert = useUpsertSalaryStructure();

  const n = (v) => Number(v) || 0;
  const gross =
    n(form.basic_pay) +
    n(form.housing_allowance) +
    n(form.transport_allowance) +
    n(form.other_allowances);
  const deductions =
    n(form.paye) + n(form.nssf) + n(form.shif) + n(form.housing_levy) + n(form.other_deductions);
  const net = gross - deductions;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await upsert.mutateAsync({ id: employee.id, ...form });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-800 border-l border-surface-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {employee.name}
            </h2>
            <p className="text-xs text-surface-400 capitalize">
              {employee.role}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-700 text-surface-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {/* Earnings */}
          <div>
            <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-3">
              Earnings
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["basic_pay", "Basic Pay"],
                ["housing_allowance", "Housing Allowance"],
                ["transport_allowance", "Transport Allowance"],
                ["other_allowances", "Other Allowances"],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className={labelCls}>{label}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputCls}
                    value={form[k]}
                    onChange={set(k)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Deductions */}
          <div>
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">
              Deductions
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["paye", "PAYE"],
                ["nssf", "NSSF"],
                ["shif", "SHIF"],
                ["housing_levy", "Housing Levy"],
                ["other_deductions", "Other Deductions"],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className={labelCls}>{label}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputCls}
                    value={form[k]}
                    onChange={set(k)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
              Payment
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Payment Method</label>
                <select
                  className={inputCls}
                  value={form.payment_method}
                  onChange={set("payment_method")}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="mpesa">M-Pesa</option>
                </select>
              </div>
              {form.payment_method === "bank" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Bank Name</label>
                    <input
                      className={inputCls}
                      value={form.bank_name}
                      onChange={set("bank_name")}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Account Number</label>
                    <input
                      className={inputCls}
                      value={form.account_number}
                      onChange={set("account_number")}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Summary */}
          <div className="bg-surface-900 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-surface-300">
              <span>Gross Pay</span>
              <span className="text-white font-medium">{fmt(gross)}</span>
            </div>
            <div className="flex justify-between text-surface-300">
              <span>Total Deductions</span>
              <span className="text-red-400 font-medium">
                -{fmt(deductions)}
              </span>
            </div>
            <div className="flex justify-between border-t border-surface-700 pt-2 text-white font-semibold">
              <span>Net Pay</span>
              <span className="text-emerald-400">{fmt(net)}</span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={upsert.isPending}
            className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {upsert.isPending ? "Saving…" : "Save Structure"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Process Run Panel
// ---------------------------------------------------------------------------
const ProcessRunPanel = ({ employees, onClose }) => {
  const today = new Date();
  const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const [form, setForm] = useState({
    period: defaultPeriod,
    salary_account_id: "",
    payable_account_id: "",
    notes: "",
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts({ active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const expenseAccounts = accounts.filter((a) => a.account_class === "expense");
  const liabilityAccounts = accounts.filter(
    (a) => a.account_class === "liability",
  );

  const processMutation = useProcessPayrollRun();

  const eligible = employees.filter((e) => !!getStruct(e));

  const n = (v) => Number(v) || 0;
  const estimatedGross = eligible.reduce((sum, emp) => {
    const s = getStruct(emp);
    return (
      sum +
      n(s.basic_pay) +
      n(s.housing_allowance) +
      n(s.transport_allowance) +
      n(s.other_allowances)
    );
  }, 0);
  const estimatedDeductions = eligible.reduce((sum, emp) => {
    const s = getStruct(emp);
    return sum + n(s.paye) + n(s.nssf) + n(s.shif) + n(s.housing_levy) + n(s.other_deductions);
  }, 0);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await processMutation.mutateAsync(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-800 border-l border-surface-700 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Process Payroll Run
            </h2>
            <p className="text-xs text-surface-400">
              {eligible.length} employee(s) will be included
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-700 text-surface-400"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          <div>
            <label className={labelCls}>Payroll Period</label>
            <input
              type="month"
              required
              className={inputCls}
              value={form.period.slice(0, 7)}
              onChange={(e) =>
                setForm((f) => ({ ...f, period: e.target.value + "-01" }))
              }
            />
          </div>

          <div>
            <label className={labelCls}>Salary Expense Account</label>
            <select
              required
              className={inputCls}
              value={form.salary_account_id}
              onChange={set("salary_account_id")}
            >
              <option value="">Select account…</option>
              {expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Salaries Payable Account</label>
            <select
              required
              className={inputCls}
              value={form.payable_account_id}
              onChange={set("payable_account_id")}
            >
              <option value="">Select account…</option>
              {liabilityAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Notes (optional)</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={set("notes")}
            />
          </div>

          {/* Preview */}
          <div className="bg-surface-900 rounded-xl p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
              Estimated Totals
            </p>
            <div className="flex justify-between text-surface-300">
              <span>Employees</span>
              <span className="text-white font-medium">{eligible.length}</span>
            </div>
            <div className="flex justify-between text-surface-300">
              <span>Gross Payroll</span>
              <span className="text-white font-medium">
                {fmt(estimatedGross)}
              </span>
            </div>
            <div className="flex justify-between text-surface-300">
              <span>Total Deductions</span>
              <span className="text-red-400 font-medium">
                -{fmt(estimatedDeductions)}
              </span>
            </div>
            <div className="flex justify-between border-t border-surface-700 pt-2 text-white font-semibold">
              <span>Net Payroll</span>
              <span className="text-emerald-400">
                {fmt(estimatedGross - estimatedDeductions)}
              </span>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-surface-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={processMutation.isPending || eligible.length === 0}
            className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {processMutation.isPending ? "Processing…" : "Process & Post GL"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Run Detail Row (expandable)
// ---------------------------------------------------------------------------
const RunDetailRow = ({ runId, colSpan }) => {
  const { data: run, isLoading } = usePayrollRunDetail(runId);

  if (isLoading)
    return (
      <tr>
        <td
          colSpan={colSpan}
          className="px-6 py-4 text-center text-sm text-surface-400"
        >
          Loading…
        </td>
      </tr>
    );

  if (!run?.payroll_run_lines?.length)
    return (
      <tr>
        <td
          colSpan={colSpan}
          className="px-6 py-4 text-center text-sm text-surface-400"
        >
          No lines found.
        </td>
      </tr>
    );

  return (
    <tr>
      <td colSpan={colSpan} className="px-6 pb-4">
        <div className="bg-surface-900 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="px-4 py-2 text-left text-xs font-medium text-surface-400">
                  Employee
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-surface-400">
                  Gross
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-surface-400">
                  Deductions
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-surface-400">
                  Net Pay
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-surface-400">
                  Method
                </th>
              </tr>
            </thead>
            <tbody>
              {run.payroll_run_lines.map((line) => (
                <tr
                  key={line.id}
                  className="border-b border-surface-800 last:border-0"
                >
                  <td className="px-4 py-2 text-white">
                    {line.profiles?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-surface-300">
                    {fmt(line.gross_pay)}
                  </td>
                  <td className="px-4 py-2 text-right text-red-400">
                    -{fmt(line.total_deductions)}
                  </td>
                  <td className="px-4 py-2 text-right text-emerald-400 font-medium">
                    {fmt(line.net_pay)}
                  </td>
                  <td className="px-4 py-2 text-center text-surface-400 capitalize">
                    {line.payment_method}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
};

// ---------------------------------------------------------------------------
// Employees Tab
// ---------------------------------------------------------------------------
const EmployeesTab = () => {
  const [editTarget, setEditTarget] = useState(null);
  const { data: employees = [], isLoading } = usePayrollEmployees();

  const n = (v) => Number(v) || 0;
  const computeGross = (s) =>
    n(s.basic_pay) +
    n(s.housing_allowance) +
    n(s.transport_allowance) +
    n(s.other_allowances);
  const computeNet = (s) =>
    computeGross(s) -
    (n(s.paye) + n(s.nssf) + n(s.shif) + n(s.housing_levy) + n(s.other_deductions));

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20 text-surface-400">
        Loading employees…
      </div>
    );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700">
              {[
                "Name",
                "Role",
                "Basic Pay",
                "Gross Pay",
                "Net Pay",
                "Method",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {employees.map((emp) => {
              const s = getStruct(emp);
              return (
                <tr
                  key={emp.id}
                  className="hover:bg-surface-700/30 transition-colors"
                >
                  <td className="px-6 py-4 text-white font-medium">
                    {emp.name}
                  </td>
                  <td className="px-6 py-4 text-surface-300 capitalize">
                    {emp.role}
                  </td>
                  <td className="px-6 py-4 text-surface-300">
                    {s ? fmt(s.basic_pay) : "—"}
                  </td>
                  <td className="px-6 py-4 text-surface-300">
                    {s ? fmt(computeGross(s)) : "—"}
                  </td>
                  <td className="px-6 py-4 text-emerald-400 font-medium">
                    {s ? fmt(computeNet(s)) : "—"}
                  </td>
                  <td className="px-6 py-4 text-surface-400 capitalize">
                    {s?.payment_method ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setEditTarget(emp)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 rounded-lg text-surface-300 hover:text-white transition-colors"
                    >
                      {s ? <Edit2 size={12} /> : <Plus size={12} />}
                      {s ? "Edit" : "Add"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {employees.length === 0 && (
          <div className="text-center py-12 text-surface-400">
            No employees found.
          </div>
        )}
      </div>

      {editTarget && (
        <SalaryPanel
          employee={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Payroll Runs Tab
// ---------------------------------------------------------------------------
const RunsTab = ({ employees }) => {
  const [panelOpen, setPanelOpen] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState(null);

  const { data: runs = [], isLoading } = usePayrollRuns();
  const markPaid = useMarkRunPaid();

  const toggleExpand = (id) =>
    setExpandedRunId((prev) => (prev === id ? null : id));

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20 text-surface-400">
        Loading payroll runs…
      </div>
    );

  return (
    <>
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-surface-700 flex justify-end">
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <Play size={14} />
          Process Payroll Run
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-700">
              {[
                "",
                "Period",
                "Employees",
                "Gross",
                "Deductions",
                "Net",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {runs.map((run) => (
              <>
                <tr
                  key={run.id}
                  className="hover:bg-surface-700/30 transition-colors"
                >
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleExpand(run.id)}
                      className="p-1 rounded hover:bg-surface-600 text-surface-400 transition-colors"
                    >
                      {expandedRunId === run.id ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-white font-medium">
                    {fmtPeriod(run.period)}
                  </td>
                  <td className="px-6 py-4 text-surface-300">
                    {run.employee_count}
                  </td>
                  <td className="px-6 py-4 text-surface-300">
                    {fmt(run.total_gross)}
                  </td>
                  <td className="px-6 py-4 text-red-400">
                    -{fmt(run.total_deductions)}
                  </td>
                  <td className="px-6 py-4 text-emerald-400 font-medium">
                    {fmt(run.total_net)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-6 py-4">
                    {run.status === "processed" && (
                      <button
                        onClick={() => markPaid.mutate(run.id)}
                        disabled={markPaid.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={12} />
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
                {expandedRunId === run.id && (
                  <RunDetailRow
                    key={`detail-${run.id}`}
                    runId={run.id}
                    colSpan={8}
                  />
                )}
              </>
            ))}
          </tbody>
        </table>

        {runs.length === 0 && (
          <div className="text-center py-12 text-surface-400">
            No payroll runs yet. Process the first one above.
          </div>
        )}
      </div>

      {panelOpen && (
        <ProcessRunPanel
          employees={employees}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
const PayrollPage = () => {
  const [activeTab, setActiveTab] = useState("employees");
  const { data: employees = [] } = usePayrollEmployees();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Payroll</h1>
        <p className="text-sm text-surface-400 mt-1">
          Manage employee salary structures and monthly payroll runs
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div className="flex border-b border-surface-700">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary-400 border-b-2 border-primary-400 -mb-px bg-surface-700/30"
                    : "text-surface-400 hover:text-white hover:bg-surface-700/20"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "employees" && <EmployeesTab />}
        {activeTab === "runs" && <RunsTab employees={employees} />}
      </div>
    </div>
  );
};

export default PayrollPage;
