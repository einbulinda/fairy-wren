import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useProcessPayrollRun } from "@/hooks/usePayroll";
import { fetchAccounts } from "@/services/accounts.service";
import { fmt, inputCls, labelCls, getStruct } from "./payrollUtils";

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
    return (
      sum +
      n(s.paye) +
      n(s.nssf) +
      n(s.shif) +
      n(s.housing_levy) +
      n(s.other_deductions)
    );
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
                  {a.name}
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
                  {a.name}
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

export default ProcessRunPanel;
