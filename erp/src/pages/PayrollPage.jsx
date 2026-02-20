import { useState } from "react";
import {
  Users,
  Play,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Briefcase,
  Printer,
} from "lucide-react";
import {
  usePayrollEmployees,
  usePayrollRuns,
  usePayrollRunDetail,
  useMarkRunPaid,
  useMarkLinePaid,
} from "@/hooks/usePayroll";
import PayslipModal from "@/components/payroll/PayslipModal";
import SalaryPanel from "@/components/payroll/SalaryPanel";
import ProcessRunPanel from "@/components/payroll/ProcessRunPanel";
import { fmt, fmtPeriod, getStruct } from "@/components/payroll/payrollUtils";

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
// Run Detail Row (expandable)
// ---------------------------------------------------------------------------
const RunDetailRow = ({ runId, colSpan }) => {
  const { data: run, isLoading } = usePayrollRunDetail(runId);
  const markLinePaid = useMarkLinePaid();
  const [payslipLine, setPayslipLine] = useState(null);

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
    <>
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
                  <th className="px-4 py-2 text-center text-xs font-medium text-surface-400">
                    Paid
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-surface-400">
                    Actions
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
                    <td className="px-4 py-2 text-center">
                      {line.is_paid ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-700 text-surface-400">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        {!line.is_paid && run.status === "processed" && (
                          <button
                            onClick={() =>
                              markLinePaid.mutate({ runId, lineId: line.id })
                            }
                            disabled={markLinePaid.isPending}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <CheckCircle size={11} />
                            Paid
                          </button>
                        )}
                        <button
                          onClick={() => setPayslipLine(line)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white rounded-lg transition-colors"
                        >
                          <Printer size={11} />
                          Payslip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </td>
      </tr>

      {payslipLine && (
        <PayslipModal
          line={payslipLine}
          run={run}
          onClose={() => setPayslipLine(null)}
        />
      )}
    </>
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
    (n(s.paye) +
      n(s.nssf) +
      n(s.shif) +
      n(s.housing_levy) +
      n(s.other_deductions));

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
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">
                      {s?.full_name || emp.name}
                    </p>
                    {s?.full_name && (
                      <p className="text-xs text-surface-500">{emp.name}</p>
                    )}
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
