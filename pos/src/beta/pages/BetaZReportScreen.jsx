import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useZReport } from "@/hooks/useZReport";
import { useZReportBills } from "@/hooks/useZReportBills";
import { ReportsService } from "@/services/reports.service";
import {
  FileText,
  DollarSign,
  Smartphone,
  Banknote,
  RefreshCw,
  Lock,
  Receipt,
  Users,
  Package,
  XCircle,
  Printer,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  X,
} from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { formatCurrency } from "@/utils/common";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/shared/ConfirmModal";

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

// Default to today (current day)
const getDefaultDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// Format date nicely
const formatDate = (d) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Check if date is today
const isToday = (d) => {
  const date = new Date(d);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const BetaZReportScreen = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(getDefaultDate());
  const { data: report, loading, refetch } = useZReport(date);
  const { bills: billsList, loading: billsLoading } = useZReportBills(date);
  const [generating, setGenerating] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [expandedPaymentType, setExpandedPaymentType] = useState(null);
  const [expandedBill, setExpandedBill] = useState(null);
  const [outstandingModal, setOutstandingModal] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    payments: true,
    categories: false,
    products: false,
    staff: false,
  });

  const hasPermission = user?.permissions?.includes("z_report");

  const handleGenerateZReport = async () => {
    setGenerating(true);
    try {
      await ReportsService.generateZReport(date);
      toast.success("Z-Report generated successfully");
      await refetch();
    } catch (error) {
      toast.error("Failed to generate Z-Report");
    } finally {
      setGenerating(false);
      setShowGenerateConfirm(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Payment method icons
  const methodIcons = {
    Cash: Banknote,
    "M-Pesa": Smartphone,
  };

  // Extract data
  const bills = report?.bills || {};
  const payments = report?.payments || [];
  const categories = report?.categories || [];
  const products = report?.products || [];
  const servers = report?.servers || [];
  const voids = report?.voids || [];
  const outstanding = report?.outstanding || {};

  // Calculate totals
  const totalRevenue = useMemo(() => {
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  // Calculate totals by payment method
  const paymentMethodTotals = useMemo(() => {
    const totals = {};
    payments.forEach((p) => {
      totals[p.method] = (totals[p.method] || 0) + (p.amount || 0);
    });
    return totals;
  }, [payments]);

  // Total bills count
  const totalBills = (bills.completed || 0) + (bills.open || 0);

  const billsByPaymentType = useMemo(() => {
    const map = {};
    for (const bill of billsList) {
      for (const pmt of bill.payments || []) {
        const key = pmt.payment_type;
        if (!map[key]) map[key] = [];
        if (!map[key].find((b) => b.id === bill.id)) map[key].push(bill);
      }
    }
    return map;
  }, [billsList]);

  if (!hasPermission) {
    return (
      <div className="h-[calc(100vh-60px)] flex items-center justify-center p-4">
        <div className="text-center">
          <Lock size={48} className="text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You need Z-Report access to view this page</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col overflow-hidden bg-slate-950">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Z-Report</h1>
              {isToday(date) && (
                <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 text-xs font-medium rounded-full">
                  Today
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{formatDate(date)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={refetch}
              className="p-2.5 hover:bg-slate-800 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw size={20} className="text-gray-400" />
            </button>
            <button
              onClick={() => window.print()}
              className="p-2.5 hover:bg-slate-800 rounded-xl transition-colors"
              title="Print"
            >
              <Printer size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              const d = new Date(date);
              d.setDate(d.getDate() - 1);
              setDate(d.toISOString().split("T")[0]);
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <ChevronDown className="rotate-90" size={18} />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-pink-500/50"
          />
          <button
            onClick={() => {
              const d = new Date(date);
              d.setDate(d.getDate() + 1);
              const today = new Date();
              if (d <= today) {
                setDate(d.toISOString().split("T")[0]);
              }
            }}
            disabled={isToday(date)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl transition-colors"
          >
            <ChevronDown className="-rotate-90" size={18} />
          </button>
          <button
            onClick={() => setShowGenerateConfirm(true)}
            disabled={generating}
            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 rounded-xl font-semibold transition-all flex items-center gap-2"
          >
            {generating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <FileText size={18} />
            )}
            <span className="hidden sm:inline">Generate</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!report ? (
          <EmptyState 
            icon={Receipt}
            title="No Report Data"
            message={`No transactions found for ${formatDate(date)}`}
          />
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Revenue Overview Cards */}
            <Section title="Overview" icon={DollarSign} defaultExpanded>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                  label="Total Revenue"
                  value={formatCurrency(totalRevenue)}
                  trend={totalRevenue > 0 ? "up" : "neutral"}
                  icon={DollarSign}
                  highlight
                />
                <MetricCard
                  label="Total Bills"
                  value={totalBills}
                  subvalue={`${bills.completed || 0} paid`}
                  icon={Receipt}
                />
                <MetricCard
                  label="Cash"
                  value={formatCurrency(paymentMethodTotals["Cash"] || 0)}
                  icon={Banknote}
                />
                <MetricCard
                  label="M-Pesa"
                  value={formatCurrency(paymentMethodTotals["M-Pesa"] || 0)}
                  icon={Smartphone}
                />
              </div>

              {/* Bills Breakdown */}
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">
                      {bills.completed || 0}
                    </p>
                    <p className="text-xs text-gray-500 uppercase">Completed</p>
                  </div>
                  <div className="text-center border-x border-slate-700/50">
                    <p className="text-2xl font-bold text-amber-400">
                      {bills.open || 0}
                    </p>
                    <p className="text-xs text-gray-500 uppercase">Open</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">
                      {bills.void || 0}
                    </p>
                    <p className="text-xs text-gray-500 uppercase">Void</p>
                  </div>
                </div>
              </div>
            </Section>

            {/* Outstanding Bills Movement */}
            {(() => {
              const opening = Number(outstanding.opening ?? 0);
              const added   = Number(outstanding.added   ?? 0);
              const paid    = Number(outstanding.paid    ?? 0);
              const closing = Number(outstanding.closing ?? 0);
              const pct     = outstanding.change_pct != null ? Number(outstanding.change_pct) : null;
              const improved = pct !== null && pct < 0;
              const worsened = pct !== null && pct > 0;
              return (
                <Section title="Outstanding Bills" icon={AlertCircle}>
                  <div className="space-y-3">
                    {/* Movement cards */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Opening",  value: opening, cls: "text-gray-300",    sub: "carried forward",   modal: null },
                        { label: "+ Added",  value: added,   cls: "text-amber-400",   sub: "new unpaid today",  modal: "added" },
                        { label: "− Paid",   value: paid,    cls: "text-emerald-400", sub: "old bills settled", modal: "paid" },
                        { label: "Closing",  value: closing, cls: closing > opening ? "text-red-400" : "text-white", sub: `${outstanding.open_count ?? 0} open bill${outstanding.open_count !== 1 ? "s" : ""}`, modal: null },
                      ].map((s) => (
                        <div
                          key={s.label}
                          onClick={s.modal ? () => setOutstandingModal(s.modal) : undefined}
                          className={`bg-slate-800/60 rounded-xl p-3 ${s.modal ? "cursor-pointer hover:bg-slate-700/60 hover:ring-1 hover:ring-pink-500/40 transition-all" : ""}`}
                        >
                          <p className="text-xs text-gray-500 uppercase mb-1">{s.label}</p>
                          <p className={`text-lg font-bold tabular-nums ${s.cls}`}>{formatCurrency(s.value)}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{s.sub}</p>
                          {s.modal && <p className="text-[10px] text-pink-400/70 mt-1">View bills →</p>}
                        </div>
                      ))}
                    </div>
                    {/* Change indicator */}
                    {pct !== null && (
                      <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${improved ? "bg-emerald-500/10 text-emerald-400" : worsened ? "bg-red-500/10 text-red-400" : "bg-slate-800/50 text-gray-400"}`}>
                        {improved ? <TrendingDown size={16} className="shrink-0" /> : worsened ? <TrendingUp size={16} className="shrink-0" /> : <Minus size={16} className="shrink-0" />}
                        <span>
                          {improved
                            ? `Outstanding reduced by ${Math.abs(pct)}%`
                            : worsened
                            ? `Outstanding grew by ${Math.abs(pct)}%`
                            : "No change in outstanding balance"}
                        </span>
                      </div>
                    )}
                    {pct === null && closing > 0 && opening === 0 && (
                      <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-amber-500/10 text-amber-400">
                        <TrendingUp size={16} className="shrink-0" />
                        <span>{outstanding.open_count ?? 0} new unpaid bill{outstanding.open_count !== 1 ? "s" : ""} — no prior outstanding to compare</span>
                      </div>
                    )}
                    {closing === 0 && opening === 0 && (
                      <p className="text-xs text-gray-600 text-center py-1">No outstanding bills</p>
                    )}
                  </div>
                </Section>
              );
            })()}

            {/* Payment Methods */}
            {payments.length > 0 && (
              <Section
                title="Payment Methods"
                icon={Banknote}
                badge={payments.length}
              >
                <div className="space-y-2">
                  {payments.map((p) => {
                    const Icon = methodIcons[p.payment_type] || DollarSign;
                    const amount = p.total_amount || 0;
                    const totalRev = payments.reduce((s, x) => s + (x.total_amount || 0), 0);
                    const percentage = totalRev > 0 ? ((amount / totalRev) * 100).toFixed(1) : 0;
                    const isExpanded = expandedPaymentType === p.payment_type;
                    const typeBills = billsByPaymentType[p.payment_type] || [];
                    return (
                      <div key={p.payment_type}>
                        <button
                          className="w-full flex items-center gap-3 text-left hover:bg-slate-800/40 rounded-xl p-1 -mx-1 transition-colors"
                          onClick={() => { setExpandedPaymentType(isExpanded ? null : p.payment_type); setExpandedBill(null); }}
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                            <Icon size={18} className="text-pink-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-white capitalize">{p.payment_type}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{formatCurrency(amount)}</span>
                                {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-linear-to-r from-pink-500 to-purple-600" style={{ width: `${percentage}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-12 text-right">{percentage}%</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{p.count || 0} transactions</p>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="mt-2 ml-13 pl-2 border-l border-slate-700/50 space-y-1">
                            {billsLoading ? (
                              <div className="flex items-center gap-2 py-2 text-gray-400 text-xs">
                                <Loader2 size={12} className="animate-spin" /> Loading bills…
                              </div>
                            ) : typeBills.length === 0 ? (
                              <p className="text-gray-500 text-xs py-2">No bill detail available</p>
                            ) : (
                              typeBills.map((bill) => {
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
                                  <div key={bill.id}>
                                    <button
                                      className="w-full flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-slate-800/60 transition-colors text-left"
                                      onClick={() => setExpandedBill(isBillExpanded ? null : bill.id)}
                                    >
                                      {isBillExpanded ? <ChevronDown size={12} className="text-gray-500 shrink-0" /> : <ChevronRight size={12} className="text-gray-500 shrink-0" />}
                                      <span className="flex-1 text-sm text-gray-200 truncate">{bill.customer_name || "—"}</span>
                                      <span className="text-xs text-gray-400 shrink-0">{bill.created_by_user?.name || "—"}</span>
                                      <span className={`text-sm font-medium tabular-nums ml-2 shrink-0 ${pmtColor(p.payment_type)}`}>{formatCurrency(pmtAmount)}</span>
                                    </button>
                                    {isBillExpanded && billItems.length > 0 && (
                                      <div className="mx-3 mb-2 p-2 bg-slate-900/60 rounded-lg">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-slate-700/40">
                                              <th className="pb-1 text-left text-gray-500 font-medium">Item</th>
                                              <th className="pb-1 text-right text-gray-500 font-medium">Qty</th>
                                              <th className="pb-1 text-right text-gray-500 font-medium">Amount</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-700/20">
                                            {billItems.map((item, idx) => (
                                              <tr key={idx}>
                                                <td className="py-1 text-gray-300">{item.product?.name || "—"}</td>
                                                <td className="py-1 text-right text-gray-400 tabular-nums">{item.quantity}</td>
                                                <td className="py-1 text-right text-white tabular-nums">{formatCurrency(item.quantity * item.price)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                          <tfoot>
                                            <tr className="border-t border-slate-600/50">
                                              <td colSpan={3} className="pt-2 pb-0.5">
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                  {billPayments.map((pmt) => (
                                                    <span key={pmt.payment_type} className={`font-semibold tabular-nums ${pmtColor(pmt.payment_type)}`}>
                                                      <span className="text-gray-500 font-normal capitalize">{pmt.payment_type}: </span>
                                                      {formatCurrency(pmt.amount)}
                                                    </span>
                                                  ))}
                                                  {outstanding > 0.005 && (
                                                    <span className="font-semibold tabular-nums text-amber-400">
                                                      <span className="text-gray-500 font-normal">Outstanding: </span>
                                                      {formatCurrency(outstanding)}
                                                    </span>
                                                  )}
                                                  <span className="font-semibold tabular-nums text-white ml-auto">
                                                    <span className="text-gray-500 font-normal">Bill Total: </span>
                                                    {formatCurrency(billTotal)}
                                                  </span>
                                                </div>
                                              </td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Sales by Category */}
            {categories.length > 0 && (
              <Section
                title="Sales by Category"
                icon={Package}
                badge={categories.length}
              >
                <div className="space-y-3">
                  {categories
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((cat, idx) => {
                      const categoryName = cat.category_name || cat.category || cat.name || `Category ${idx + 1}`;
                      const percentage = totalRevenue > 0
                        ? ((cat.revenue / totalRevenue) * 100).toFixed(1)
                        : 0;
                      return (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white">
                              {categoryName}
                            </span>
                            <span className="font-bold text-white">
                              {formatCurrency(cat.revenue)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-12 text-right">
                              {percentage}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {cat.quantity_sold} items sold
                          </p>
                        </div>
                      );
                    })}
                </div>
              </Section>
            )}

            {/* Top Products */}
            {products.length > 0 && (
              <Section
                title="Top Products"
                icon={TrendingUp}
                badge={products.length}
              >
                <div className="space-y-2">
                  {products
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 10)
                    .map((prod, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl"
                      >
                        <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-400">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {prod.product_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {prod.quantity_sold} sold
                          </p>
                        </div>
                        <p className="font-bold text-white">
                          {formatCurrency(prod.revenue)}
                        </p>
                      </div>
                    ))}
                </div>
              </Section>
            )}

            {/* Staff Performance */}
            {servers.length > 0 && (
              <Section
                title="Staff Performance"
                icon={Users}
                badge={servers.length}
              >
                <div className="space-y-2">
                  {servers
                    .sort((a, b) => b.total_sales - a.total_sales)
                    .map((server) => (
                      <div
                        key={server.server_name}
                        className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-emerald-400">
                            {server.server_name?.charAt(0) || "?"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">
                            {server.server_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {server.bills_served} bills
                          </p>
                        </div>
                        <p className="font-bold text-white">
                          {formatCurrency(server.total_sales)}
                        </p>
                      </div>
                    ))}
                </div>
              </Section>
            )}

            {/* Voided Items */}
            {voids.length > 0 && (
              <Section
                title="Voided Items"
                icon={XCircle}
                badge={voids.length}
                variant="danger"
              >
                <div className="space-y-2">
                  {voids.map((v, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {v.product_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {v.quantity} @ {formatCurrency(v.unit_price)}
                        </p>
                      </div>
                      <p className="font-bold text-red-400">
                        -{formatCurrency(v.total)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-red-500/20">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Total Voided</span>
                    <span className="font-bold text-red-400">
                      {formatCurrency(voids.reduce((s, v) => s + v.total, 0))}
                    </span>
                  </div>
                </div>
              </Section>
            )}
          </div>
        )}
      </div>

      {/* Outstanding bills drill-down modal */}
      {outstandingModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setOutstandingModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 shrink-0">
              <h3 className="font-bold text-white">
                {outstandingModal === "added" ? "Bills Added Today" : "Bills Paid Today"}
              </h3>
              <button
                onClick={() => setOutstandingModal(null)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={18} className="text-gray-400" />
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
                    <thead className="bg-slate-900/80 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Server</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                        {isPaid && <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th>}
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {list.map((bill, i) => (
                        <tr key={bill.id || i} className="hover:bg-slate-800/40">
                          <td className="px-4 py-2 text-white">{bill.customer}</td>
                          <td className="px-4 py-2 text-gray-400">{bill.server}</td>
                          <td className="px-4 py-2 text-right text-gray-300 tabular-nums">{formatCurrency(bill.bill_total)}</td>
                          {isPaid && <td className="px-4 py-2 text-right text-emerald-400 tabular-nums">{formatCurrency(bill.paid_today)}</td>}
                          <td className="px-4 py-2 text-right text-amber-400 font-medium tabular-nums">{formatCurrency(bill.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-700/50 bg-slate-900/60">
                      <tr>
                        <td colSpan={isPaid ? 4 : 3} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                          {list.length} bill{list.length !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-amber-400 tabular-nums">
                          {formatCurrency(list.reduce((s, b) => s + Number(b.outstanding || 0), 0))}
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

      {/* Generate Confirmation */}
      {showGenerateConfirm && (
        <ConfirmModal
          title="Generate Z-Report?"
          message={`Generate Z-Report for ${formatDate(date)}? This will finalize the day's transactions.`}
          confirmLabel="Generate"
          cancelLabel="Cancel"
          variant="primary"
          onConfirm={handleGenerateZReport}
          onCancel={() => setShowGenerateConfirm(false)}
        />
      )}
    </div>
  );
};

// Section Component
const Section = ({ 
  title, 
  icon: Icon, 
  children, 
  badge,
  variant = "default",
  defaultExpanded = false 
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const variants = {
    default: "border-slate-700/30 bg-slate-800/30",
    danger: "border-red-500/30 bg-red-500/5",
  };

  return (
    <div className={`rounded-xl border ${variants[variant]} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={18} className={variant === "danger" ? "text-red-400" : "text-pink-400"} />
          <h3 className="font-semibold text-white">{title}</h3>
          {badge && (
            <span className="px-2 py-0.5 bg-slate-700 text-gray-300 text-xs rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700/30">{children}</div>
      )}
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ label, value, subvalue, icon: Icon, trend, highlight }) => (
  <div className={`p-4 rounded-xl ${highlight ? "bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/30" : "bg-slate-800/50 border border-slate-700/30"}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-400 uppercase mb-1">{label}</p>
        <p className={`text-xl font-bold ${highlight ? "text-white" : "text-white"}`}>
          {value}
        </p>
        {subvalue && (
          <p className="text-xs text-gray-500 mt-0.5">{subvalue}</p>
        )}
      </div>
      <div className={`p-2 rounded-lg ${highlight ? "bg-pink-500/20" : "bg-slate-700/50"}`}>
        <Icon size={18} className={highlight ? "text-pink-400" : "text-gray-400"} />
      </div>
    </div>
    {trend && (
      <div className="mt-2">
        {trend === "up" && <TrendingUp size={14} className="text-emerald-400" />}
        {trend === "down" && <TrendingDown size={14} className="text-red-400" />}
        {trend === "neutral" && <Minus size={14} className="text-gray-500" />}
      </div>
    )}
  </div>
);

// Empty State Component
const EmptyState = ({ icon: Icon, title, message }) => (
  <div className="flex flex-col items-center justify-center h-64 text-center p-4">
    <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
      <Icon size={32} className="text-gray-600" />
    </div>
    <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
    <p className="text-gray-400">{message}</p>
  </div>
);

export default BetaZReportScreen;
