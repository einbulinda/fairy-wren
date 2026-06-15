import { Printer, X } from "lucide-react";
import { fmt, fmtPeriod } from "./payrollUtils";

const PayslipModal = ({ line, run, onClose }) => {
  const period = fmtPeriod(run?.period);

  const row = (label, value, colorCls = "text-gray-700") => (
    <div
      key={label}
      className="flex justify-between py-1.5 border-b border-gray-100 last:border-0"
    >
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-sm font-medium ${colorCls}`}>{fmt(value)}</span>
    </div>
  );

  return (
    <>
      {/* Isolate payslip content during browser print */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #payslip-content, #payslip-content * { visibility: visible; }
          #payslip-content {
            position: fixed; top: 0; left: 0;
            width: 100%; padding: 40px;
            box-sizing: border-box;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative bg-surface-800 rounded-xl border border-surface-700 w-full max-w-md mx-4 overflow-hidden shadow-2xl">
          {/* Toolbar (screen only, hidden on print) */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-700">
            <h2 className="text-white font-semibold text-sm">
              Payslip Preview
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
              >
                <Printer size={13} />
                Print / Save PDF
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Payslip body — white/print-ready */}
          <div id="payslip-content" className="bg-white text-gray-900 p-8">
            {/* Org header */}
            <div className="flex items-center gap-3 border-b border-gray-200 pb-5 mb-5">
              <img
                src="/fairy-wren-logo-removebg.png"
                alt="Fairy Wren Ltd"
                className="w-12 h-12 object-contain flex-shrink-0"
              />
              <div className="flex-1">
                <h2 className="font-black text-gray-900 text-base leading-tight">
                  Fairy Wren Ltd
                </h2>
                <p className="text-xs text-gray-400">Payroll Department</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Payslip
                </p>
                <p className="text-sm font-bold text-gray-900">{period}</p>
              </div>
            </div>

            {/* Employee */}
            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-5 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <p className="text-xs text-gray-400">Employee Name</p>
                <p className="font-semibold text-gray-900">
                  {line.full_name || line.profiles?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Role</p>
                <p className="font-medium text-gray-700 capitalize">
                  {line.profiles?.role ?? "—"}
                </p>
              </div>
              {line.id_number && (
                <div>
                  <p className="text-xs text-gray-400">ID Number</p>
                  <p className="font-medium text-gray-700">{line.id_number}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Payment Method</p>
                <p className="font-medium text-gray-700 capitalize">
                  {line.payment_method}
                  {line.payment_method === "mpesa" && line.mpesa_number
                    ? ` · ${line.mpesa_number}`
                    : ""}
                </p>
              </div>
            </div>

            {/* Earnings */}
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">
              Earnings
            </p>
            <div className="mb-5">
              {row("Basic Pay", line.basic_pay)}
              {Number(line.housing_allowance) > 0 &&
                row("Housing Allowance", line.housing_allowance)}
              {Number(line.transport_allowance) > 0 &&
                row("Transport Allowance", line.transport_allowance)}
              {Number(line.other_allowances) > 0 &&
                row("Other Allowances", line.other_allowances)}
              <div className="flex justify-between py-1.5 mt-1 border-t border-gray-300">
                <span className="text-sm font-semibold text-gray-900">
                  Gross Pay
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {fmt(line.gross_pay)}
                </span>
              </div>
            </div>

            {/* Deductions */}
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
              Deductions
            </p>
            <div className="mb-5">
              {Number(line.paye) > 0 && row("PAYE", line.paye, "text-red-600")}
              {Number(line.nssf) > 0 && row("NSSF", line.nssf, "text-red-600")}
              {Number(line.shif) > 0 && row("SHIF", line.shif, "text-red-600")}
              {Number(line.housing_levy) > 0 &&
                row("Housing Levy", line.housing_levy, "text-red-600")}
              {Number(line.other_deductions) > 0 &&
                row("Other Deductions", line.other_deductions, "text-red-600")}
              <div className="flex justify-between py-1.5 mt-1 border-t border-gray-300">
                <span className="text-sm font-semibold text-gray-900">
                  Total Deductions
                </span>
                <span className="text-sm font-bold text-red-600">
                  -{fmt(line.total_deductions)}
                </span>
              </div>
            </div>

            {/* Net Pay */}
            <div className="bg-gray-900 text-white rounded-lg px-5 py-4 flex justify-between items-center">
              <span className="font-semibold">Net Pay</span>
              <span className="text-xl font-bold">{fmt(line.net_pay)}</span>
            </div>

            <p className="text-center text-xs text-gray-400 mt-5">
              Generated {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PayslipModal;
