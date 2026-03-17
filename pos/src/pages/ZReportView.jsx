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
import { formatCurrency } from "@/utils/common";

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const defaultDate = yesterday.toISOString().split("T")[0];

const fmt = (n) => formatCurrency(n);

const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
    <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
      <Icon size={16} className="text-yellow-400" />
      <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

const ZReportView = () => {
  const [date, setDate] = useState(defaultDate);
  const { data, loading } = useZReport(date);

  const bills = data?.bills || {};
  const payments = data?.payments || [];
  const categories = data?.categories || [];
  const products = data?.products || [];
  const servers = data?.servers || [];
  const hourly = data?.hourly || [];
  const voids = data?.voids || [];

  const fmtDate = (d) => {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <h2 className="text-lg font-bold text-yellow-400">Z-Report</h2>
          <p className="text-sm text-gray-400">{fmtDate(date)}</p>
        </div>
        <div className="flex items-center gap-3 sm:ml-auto">
          <input
            type="date"
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm font-medium rounded-lg transition-colors print:hidden"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Bills Summary */}
      <Section title="Bills Summary" icon={Receipt}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-700/30">
          {[
            { label: "Total Bills", value: bills.total ?? 0, cls: "text-white" },
            { label: "Completed", value: bills.completed ?? 0, cls: "text-green-400" },
            { label: "Open", value: bills.open ?? 0, cls: "text-yellow-400" },
            { label: "Void", value: bills.void ?? 0, cls: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-800/60 p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-700/30">
          {[
            { label: "Total Revenue", value: fmt(bills.total_revenue ?? 0), cls: "text-white" },
            { label: "Completed", value: fmt(bills.completed_revenue ?? 0), cls: "text-green-400" },
            { label: "Outstanding", value: fmt(bills.outstanding_revenue ?? 0), cls: "text-yellow-400" },
            { label: "Void Value", value: fmt(bills.void_value ?? 0), cls: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-800/60 p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase mb-1">{s.label}</p>
              <p className={`text-sm font-bold tabular-nums ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payment Breakdown */}
        <Section title="Payments" icon={CreditCard}>
          {payments.length === 0 ? (
            <p className="text-gray-500 text-sm p-4">No payments</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Count</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {payments.map((p) => (
                  <tr key={p.payment_type} className="hover:bg-gray-700/20">
                    <td className="px-4 py-2 text-white capitalize">{p.payment_type}</td>
                    <td className="px-4 py-2 text-right text-gray-300 tabular-nums">{p.count}</td>
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
            <p className="text-gray-500 text-sm p-4">No sales</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Category</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {categories.map((c) => (
                  <tr key={c.category_name} className="hover:bg-gray-700/20">
                    <td className="px-4 py-2 text-white">{c.category_name}</td>
                    <td className="px-4 py-2 text-right text-gray-300 tabular-nums">{c.total_quantity}</td>
                    <td className="px-4 py-2 text-right text-white font-medium tabular-nums">{fmt(c.total_sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Products */}
        <Section title="Top Products" icon={Package}>
          {products.length === 0 ? (
            <p className="text-gray-500 text-sm p-4">No products</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Product</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {products.map((p) => (
                  <tr key={p.product_name} className="hover:bg-gray-700/20">
                    <td className="px-4 py-2 text-white">{p.product_name}</td>
                    <td className="px-4 py-2 text-right text-gray-300 tabular-nums">{p.quantity}</td>
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
            <p className="text-gray-500 text-sm p-4">No data</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Server</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Bills</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {servers.map((s) => (
                  <tr key={s.server_name} className="hover:bg-gray-700/20">
                    <td className="px-4 py-2 text-white">{s.server_name}</td>
                    <td className="px-4 py-2 text-right text-gray-300 tabular-nums">{s.bills_count}</td>
                    <td className="px-4 py-2 text-right text-white font-medium tabular-nums">{fmt(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      {/* Hourly Sales */}
      <Section title="Hourly Sales" icon={Clock}>
        {hourly.length === 0 ? (
          <p className="text-gray-500 text-sm p-4">No hourly data</p>
        ) : (
          <div className="p-4">
            <div className="flex items-end gap-1 h-36">
              {(() => {
                const maxRevenue = Math.max(...hourly.map((h) => Number(h.revenue) || 0), 1);
                return hourly.map((h) => {
                  const pct = ((Number(h.revenue) || 0) / maxRevenue) * 100;
                  return (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                        {fmt(h.revenue)}
                      </span>
                      <div
                        className="w-full bg-yellow-500/50 rounded-t hover:bg-yellow-400/70 transition-colors"
                        style={{ height: `${Math.max(pct, 2)}%` }}
                        title={`${h.hour}:00 — ${fmt(h.revenue)} (${h.orders} orders)`}
                      />
                      <span className="text-[10px] text-gray-500 tabular-nums">
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
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Customer</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Items</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Created By</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {voids.map((v, i) => (
                <tr key={i} className="hover:bg-gray-700/20">
                  <td className="px-4 py-2 text-white">{v.customer}</td>
                  <td className="px-4 py-2 text-right text-gray-300 tabular-nums">{v.items}</td>
                  <td className="px-4 py-2 text-gray-300">{v.created_by}</td>
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

export default ZReportView;
