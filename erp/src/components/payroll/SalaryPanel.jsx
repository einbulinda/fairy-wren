import { useState } from "react";
import { X } from "lucide-react";
import { useUpsertSalaryStructure } from "@/hooks/usePayroll";
import {
  fmt,
  inputCls,
  labelCls,
  EMPTY_SALARY,
  getStruct,
} from "./payrollUtils";

const SalaryPanel = ({ employee, onClose }) => {
  const existing = getStruct(employee);
  const [form, setForm] = useState(
    existing
      ? {
          full_name: existing.full_name ?? "",
          id_number: existing.id_number ?? "",
          date_of_employment: existing.date_of_employment ?? "",
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
          mpesa_number: existing.mpesa_number ?? "",
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
    n(form.paye) +
    n(form.nssf) +
    n(form.shif) +
    n(form.housing_levy) +
    n(form.other_deductions);
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
          {/* Employee Details */}
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
              Employee Details
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Full Legal Name</label>
                <input
                  className={inputCls}
                  placeholder="As per national ID"
                  value={form.full_name}
                  onChange={set("full_name")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>National ID No. (optional)</label>
                  <input
                    className={inputCls}
                    value={form.id_number}
                    onChange={set("id_number")}
                  />
                </div>
                <div>
                  <label className={labelCls}>Date of Employment</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.date_of_employment}
                    onChange={set("date_of_employment")}
                  />
                </div>
              </div>
            </div>
          </div>

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
              {form.payment_method === "mpesa" && (
                <div>
                  <label className={labelCls}>M-Pesa Number</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. 0712345678"
                    value={form.mpesa_number}
                    onChange={set("mpesa_number")}
                  />
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

export default SalaryPanel;
