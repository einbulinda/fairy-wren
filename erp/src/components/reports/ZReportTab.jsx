import { useState } from "react";
import {
  Loader2,
  Receipt,
  Clock,
  Users,
  Package,
  CreditCard,
  BarChart3,
  XCircle,
  Printer,
} from "lucide-react";
import { useZReport } from "@/hooks/useZReport";
import { fmtNumber as fmt, fmtDate } from "@/utils/formatters";
import { dateInputCls } from "@/utils/constants";

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const defaultDate = yesterday.toISOString().split("T")[0];

const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-surface-800/30 border border-surface-700/50 rounded-xl overflow-hidden">
    <div className="px-4 py-3 border-b border-surface-700/50 flex items-center gap-2">
      <Icon size={16} className="text-primary-400" />
      <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

const ZReportTab = () => {
  const [date, setDate] = useState(defaultDate);
  const { data, isLoading } = useZReport(date);

  const bills = data?.bills || {};
  const payments = data?.payments || [];
  const categories = data?.categories || [];
  const products = data?.products || [];
  const servers = data?.servers || [];
  const hourly = data?.hourly || [];
  const voids = data?.voids || [];

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-surface-400" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
            Report Date
          </label>
          <input
            type="date"
            className={dateInputCls}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="text-sm text-surface-400">
          End-of-day summary for <span className="text-white font-medium">{fmtDate(date)}</span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-2 bg-surface-700 text-surface-300 hover:bg-surface-600 text-sm font-medium rounded-lg transition-colors sm:ml-auto print:hidden"
        >
          <Printer size={14} />
          Print
        </button>
      </div>

      {/* Bills Summary */}
      <Section title="Bills Summary" icon={Receipt}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-surface-700/30">
          {[
            { label: "Total Bills", value: bills.total ?? 0, cls: "text-white" },
            { label: "Completed", value: bills.completed ?? 0, cls: "text-emerald-400" },
            { label: "Open", value: bills.open ?? 0, cls: "text-yellow-400" },
            { label: "Void", value: bills.void ?? 0, cls: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="bg-surface-800/50 p-4 text-center">
              <p className="text-xs text-surface-400 uppercase mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-surface-700/30">
          {[
            { label: "Total Revenue", value: fmt(bills.total_revenue ?? 0), cls: "text-white" },
            { label: "Completed Revenue", value: fmt(bills.completed_revenue ?? 0), cls: "text-emerald-400" },
            { label: "Outstanding", value: fmt(bills.outstanding_revenue ?? 0), cls: "text-amber-400" },
            { label: "Void Value", value: fmt(bills.void_value ?? 0), cls: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="bg-surface-800/50 p-4 text-center">
              <p className="text-xs text-surface-400 uppercase mb-1">{s.label}</p>
              <p className={`text-lg font-bold tabular-nums ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Breakdown */}
        <Section title="Payment Breakdown" icon={CreditCard}>
          {payments.length === 0 ? (
            <p className="text-surface-500 text-sm p-4">No payments recorded</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-surface-400 uppercase">Type</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-surface-400 uppercase">Count</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-surface-400 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/30">
                {payments.map((p) => (
                  <tr key={p.payment_type} className="hover:bg-surface-700/20">
                    <td className="px-4 py-2 text-white capitalize">{p.payment_type}</td>
                    <td className="px-4 py-2 text-right text-surface-300 tabular-nums">{p.count}</td>
                    <td className="px-4 py-2 text-right text-white font-medium tabular-nums">{fmt(p.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Category Sales */}
        <Section title="Category Sales" icon={BarChart3}>
          {categories.length === 0 ? (
            <p className="text-surface-500 text-sm p-4">No category sales</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-surface-400 uppercase">Category</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-surface-400 uppercase">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-surface-400 uppercase">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/30">
                {categories.map((c) => (
                  <tr key={c.category_name} className="hover:bg-surface-700/20">
                    <td className="px-4 py-2 text-white">{c.category_name}</td>
                    <td className="px-4 py-2 text-right text-surface-300 tabular-nums">{c.total_quantity}</td>
                    <td className="px-4 py-2 text-right text-white font-medium tabular-nums">{fmt(c.total_sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Section title="Top Products" icon={Package}>
          {products.length === 0 ? (
            <p className="text-surface-500 text-sm p-4">No product sales</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-surface-400 uppercase">Product</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-surface-400 uppercase">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-surface-400 uppercase">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/30">
                {products.map((p) => (
                  <tr key={p.product_name} className="hover:bg-surface-700/20">
                    <td className="px-4 py-2 text-white">{p.product_name}</td>
                    <td className="px-4 py-2 text-right text-surface-300 tabular-nums">{p.quantity}</td>
                    <td className="px-4 py-2 text-right text-white font-medium tabular-nums">{fmt(p.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Server Performance */}
        <Section title="Server Performance" icon={Users}>
          {servers.length === 0 ? (
            <p className="text-surface-500 text-sm p-4">No server data</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-surface-400 uppercase">Server</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-surface-400 uppercase">Bills</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-surface-400 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/30">
                {servers.map((s) => (
                  <tr key={s.server_name} className="hover:bg-surface-700/20">
                    <td className="px-4 py-2 text-white">{s.server_name}</td>
                    <td className="px-4 py-2 text-right text-surface-300 tabular-nums">{s.bills_count}</td>
                    <td className="px-4 py-2 text-right text-white font-medium tabular-nums">{fmt(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      {/* Hourly Sales */}
      <Section title="Hourly Sales Distribution" icon={Clock}>
        {hourly.length === 0 ? (
          <p className="text-surface-500 text-sm p-4">No hourly data</p>
        ) : (
          <div className="p-4">
            <div className="flex items-end gap-1 h-40">
              {(() => {
                const maxRevenue = Math.max(...hourly.map((h) => Number(h.revenue) || 0), 1);
                return hourly.map((h) => {
                  const pct = ((Number(h.revenue) || 0) / maxRevenue) * 100;
                  return (
                    <div
                      key={h.hour}
                      className="flex-1 flex flex-col items-center gap-1 group"
                    >
                      <span className="text-[10px] text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                        {fmt(h.revenue)}
                      </span>
                      <div
                        className="w-full bg-primary-500/60 rounded-t hover:bg-primary-400/80 transition-colors"
                        style={{ height: `${Math.max(pct, 2)}%` }}
                        title={`${h.hour}:00 — ${fmt(h.revenue)} (${h.orders} orders)`}
                      />
                      <span className="text-[10px] text-surface-500 tabular-nums">
                        {String(h.hour).padStart(2, "0")}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </Section>

      {/* Voids */}
      {voids.length > 0 && (
        <Section title="Voided Bills" icon={XCircle}>
          <table className="w-full text-sm">
            <thead className="bg-surface-900/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-surface-400 uppercase">Customer</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-surface-400 uppercase">Items</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-surface-400 uppercase">Created By</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-surface-400 uppercase">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/30">
              {voids.map((v, i) => (
                <tr key={i} className="hover:bg-surface-700/20">
                  <td className="px-4 py-2 text-white">{v.customer}</td>
                  <td className="px-4 py-2 text-right text-surface-300 tabular-nums">{v.items}</td>
                  <td className="px-4 py-2 text-surface-300">{v.created_by}</td>
                  <td className="px-4 py-2 text-right text-red-400 font-medium tabular-nums">{fmt(v.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
};

export default ZReportTab;
