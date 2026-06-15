import { useState, useMemo } from "react";
import {
  Loader2,
  Receipt,
  Users,
  Package,
  CreditCard,
  BarChart3,
  XCircle,
  Printer,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  X,
} from "lucide-react";
import { useZReport } from "@/hooks/useZReport";
import { useZReportBills } from "@/hooks/useZReportBills";
import { formatCurrency } from "@/utils/common";
import { localDateStr } from "@/utils/formatters";

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const defaultDate = localDateStr(yesterday);

const fmt = (n) => formatCurrency(n);

const PMT_COLORS = {
  cash: "text-emerald-400",
  mpesa: "text-sky-400",
  "m-pesa": "text-sky-400",
  card: "text-violet-400",
  cheque: "text-amber-300",
  credit: "text-rose-400",
};

const pmtColor = (type) =>
  PMT_COLORS[(type || "").toLowerCase()] ?? "text-cyan-400";

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
  const [expandedPaymentType, setExpandedPaymentType] = useState(null);
  const [expandedBill, setExpandedBill] = useState(null);
  const [outstandingModal, setOutstandingModal] = useState(null);

  const { data, loading } = useZReport(date);
  const { bills: billsList, loading: billsLoading } = useZReportBills(date);

  const bills = data?.bills || {};
  const payments = data?.payments || [];
  const categories = data?.categories || [];
  const products = data?.products || [];
  const servers = data?.servers || [];
  const voids = data?.voids || [];
  const outstanding = data?.outstanding || {};

  const billsByPaymentType = useMemo(() => {
    const map = {};
    for (const bill of billsList) {
      for (const pmt of bill.payments || []) {
        const key = pmt.payment_type;
        if (!map[key]) map[key] = [];
        if (!map[key].find((b) => b.id === bill.id)) {
          map[key].push(bill);
        }
      }
    }
    return map;
  }, [billsList]);

  const fmtDate = (d) => {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Nairobi",
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
            onChange={(e) => { setDate(e.target.value); setExpandedPaymentType(null); setExpandedBill(null); }}
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

      {/* Outstanding Bills Movement */}
      <Section title="Outstanding Bills" icon={AlertCircle}>
        {(() => {
          const opening = Number(outstanding.opening ?? 0);
          const added   = Number(outstanding.added   ?? 0);
          const paid    = Number(outstanding.paid    ?? 0);
          const closing = Number(outstanding.closing ?? 0);
          const pct     = outstanding.change_pct != null ? Number(outstanding.change_pct) : null;
          const improved = pct !== null && pct < 0;
          const worsened = pct !== null && pct > 0;
          return (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Opening Balance", value: fmt(opening), cls: "text-gray-300",   sub: "carried forward",   modal: null },
                  { label: "+ Added Today",   value: fmt(added),   cls: "text-amber-400",  sub: "new unpaid bills",  modal: "added" },
                  { label: "− Paid Today",    value: fmt(paid),    cls: "text-green-400",  sub: "old bills settled", modal: "paid" },
                  { label: "Closing Balance", value: fmt(closing), cls: closing > opening ? "text-red-400" : "text-white", sub: `${outstanding.open_count ?? 0} open bill${outstanding.open_count !== 1 ? "s" : ""}`, modal: null },
                ].map((s) => (
                  <div
                    key={s.label}
                    onClick={s.modal ? () => setOutstandingModal(s.modal) : undefined}
                    className={`bg-gray-900/50 rounded-lg p-3 space-y-1 ${s.modal ? "cursor-pointer hover:bg-gray-800/70 hover:ring-1 hover:ring-yellow-500/40 transition-all" : ""}`}
                  >
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                    <p className={`text-lg font-bold tabular-nums ${s.cls}`}>{s.value}</p>
                    <p className="text-xs text-gray-600">{s.sub}</p>
                    {s.modal && <p className="text-[10px] text-yellow-500/70 mt-0.5">View bills →</p>}
                  </div>
                ))}
              </div>
              {pct !== null && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${improved ? "bg-green-500/10 text-green-400" : worsened ? "bg-red-500/10 text-red-400" : "bg-gray-800/50 text-gray-400"}`}>
                  {improved ? <TrendingDown size={16} /> : worsened ? <TrendingUp size={16} /> : null}
                  {improved
                    ? `Outstanding reduced by ${Math.abs(pct)}% — good progress on collections`
                    : worsened
                    ? `Outstanding grew by ${Math.abs(pct)}% — more unpaid bills than start of day`
                    : "No change in outstanding balance"}
                </div>
              )}
              {pct === null && closing === 0 && opening === 0 && (
                <p className="text-xs text-gray-600 text-center py-1">No outstanding bills</p>
              )}
              {pct === null && closing > 0 && opening === 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-amber-500/10 text-amber-400">
                  <TrendingUp size={16} />
                  {`${outstanding.open_count ?? 0} new unpaid bill${outstanding.open_count !== 1 ? "s" : ""} opened today — no prior outstanding to compare`}
                </div>
              )}
            </div>
          );
        })()}
      </Section>

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
                {payments.map((p) => {
                  const isExpanded = expandedPaymentType === p.payment_type;
                  const typeBills = billsByPaymentType[p.payment_type] || [];
                  return (
                    <>
                      <tr
                        key={p.payment_type}
                        className="hover:bg-gray-700/20 cursor-pointer select-none"
                        onClick={() => {
                          setExpandedPaymentType(isExpanded ? null : p.payment_type);
                          setExpandedBill(null);
                        }}
                      >
                        <td className="px-4 py-2 text-white capitalize flex items-center gap-1.5">
                          {isExpanded ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                          {p.payment_type}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-300 tabular-nums">{p.count}</td>
                        <td className="px-4 py-2 text-right text-white font-medium tabular-nums">{fmt(p.total_amount)}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${p.payment_type}-expanded`}>
                          <td colSpan={3} className="bg-gray-900/60 px-0 py-0">
                            {billsLoading ? (
                              <div className="flex items-center gap-2 px-6 py-3 text-gray-400 text-xs">
                                <Loader2 size={12} className="animate-spin" /> Loading bills…
                              </div>
                            ) : typeBills.length === 0 ? (
                              <p className="px-6 py-3 text-gray-500 text-xs">No bill detail available</p>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-700/40">
                                    <th className="px-6 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-4"></th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Server</th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/20">
                                  {typeBills.map((bill) => {
                                    const isBillExpanded = expandedBill === bill.id;
                                    const billItems = (bill.rounds || []).flatMap((r) => r.round_items || []);
                                    const billTotal = (bill.rounds || []).reduce(
                                      (sum, r) => sum + (r.round_items || []).reduce((rs, i) => rs + i.quantity * i.price, 0),
                                      0,
                                    );
                                    const billPayments = bill.payments || [];
                                    const pmtAmount = billPayments.find((pmt) => pmt.payment_type === p.payment_type)?.amount ?? 0;
                                    const totalPaid = billPayments.reduce((s, pmt) => s + (Number(pmt.amount) || 0), 0);
                                    const outstanding = billTotal - totalPaid;
                                    return (
                                      <>
                                        <tr
                                          key={bill.id}
                                          className="hover:bg-gray-800/60 cursor-pointer"
                                          onClick={() => setExpandedBill(isBillExpanded ? null : bill.id)}
                                        >
                                          <td className="px-6 py-2 text-gray-500">
                                            {isBillExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                          </td>
                                          <td className="px-3 py-2 text-gray-200">{bill.customer_name || "—"}</td>
                                          <td className="px-3 py-2 text-gray-400">{bill.created_by_user?.name || "—"}</td>
                                          <td className={`px-3 py-2 text-right font-medium tabular-nums ${pmtColor(p.payment_type)}`}>{fmt(pmtAmount)}</td>
                                        </tr>
                                        {isBillExpanded && billItems.length > 0 && (
                                          <tr key={`${bill.id}-items`}>
                                            <td colSpan={4} className="px-10 py-2 bg-gray-900/80">
                                              <table className="w-full text-xs">
                                                <thead>
                                                  <tr className="border-b border-gray-700/30">
                                                    <th className="py-1 text-left text-gray-500 uppercase font-semibold">Item</th>
                                                    <th className="py-1 text-right text-gray-500 uppercase font-semibold">Qty</th>
                                                    <th className="py-1 text-right text-gray-500 uppercase font-semibold">Amount</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-700/20">
                                                  {billItems.map((item, idx) => (
                                                    <tr key={idx}>
                                                      <td className="py-1 text-gray-300">{item.product?.name || "—"}</td>
                                                      <td className="py-1 text-right text-gray-400 tabular-nums">{item.quantity}</td>
                                                      <td className="py-1 text-right text-white tabular-nums">{fmt(item.quantity * item.price)}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                                <tfoot>
                                                  <tr className="border-t border-gray-600/50">
                                                    <td colSpan={3} className="pt-2 pb-1">
                                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                        {billPayments.map((pmt) => (
                                                          <span key={pmt.payment_type} className={`font-semibold tabular-nums ${pmtColor(pmt.payment_type)}`}>
                                                            <span className="text-gray-500 font-normal capitalize">{pmt.payment_type}: </span>
                                                            {fmt(pmt.amount)}
                                                          </span>
                                                        ))}
                                                        {outstanding > 0.005 && (
                                                          <span className="font-semibold tabular-nums text-amber-400">
                                                            <span className="text-gray-500 font-normal">Outstanding: </span>
                                                            {fmt(outstanding)}
                                                          </span>
                                                        )}
                                                        <span className="font-semibold tabular-nums text-white ml-auto">
                                                          <span className="text-gray-500 font-normal">Bill Total: </span>
                                                          {fmt(billTotal)}
                                                        </span>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                </tfoot>
                                              </table>
                                            </td>
                                          </tr>
                                        )}
                                      </>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
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
      {/* Outstanding bills drill-down modal */}
      {outstandingModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setOutstandingModal(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
              <h3 className="font-semibold text-white">
                {outstandingModal === "added" ? "Bills Added Today" : "Bills Paid Today"}
              </h3>
              <button
                onClick={() => setOutstandingModal(null)}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {(() => {
                const list = outstandingModal === "added"
                  ? (outstanding.added_bills || [])
                  : (outstanding.paid_bills || []);
                if (list.length === 0)
                  return <p className="text-gray-500 text-sm p-6 text-center">No bills to display</p>;
                const isPaid = outstandingModal === "paid";
                return (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900/80 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Customer</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Server</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Bill Total</th>
                        {isPaid && <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Paid Today</th>}
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/30">
                      {list.map((bill, i) => (
                        <tr key={bill.id || i} className="hover:bg-gray-800/40">
                          <td className="px-4 py-2 text-white">{bill.customer}</td>
                          <td className="px-4 py-2 text-gray-400">{bill.server}</td>
                          <td className="px-4 py-2 text-right text-gray-300 tabular-nums">{fmt(bill.bill_total)}</td>
                          {isPaid && <td className="px-4 py-2 text-right text-green-400 tabular-nums">{fmt(bill.paid_today)}</td>}
                          <td className="px-4 py-2 text-right text-amber-400 font-medium tabular-nums">{fmt(bill.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-gray-700/50 bg-gray-900/60">
                      <tr>
                        <td colSpan={isPaid ? 4 : 3} className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">
                          {list.length} bill{list.length !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-amber-400 tabular-nums">
                          {fmt(list.reduce((s, b) => s + Number(b.outstanding || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZReportView;
