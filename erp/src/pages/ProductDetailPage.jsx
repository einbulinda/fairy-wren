import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Package,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Truck,
  DollarSign,
  BarChart2,
  Clock,
  AlertTriangle,
  Calendar,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  XCircle,
  FileText,
  X,
  User,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import {
  useProductInsights,
  useProductPurchaseHistory,
  useProductSalesHistory,
  useProductStatement,
} from "@/hooks/useProducts";
import { useBill } from "@/hooks/useBills";
import { useReceiptDetail, useStockTakeDetail } from "@/hooks/useInventory";
import { MobileCard, MobileCardList } from "@/components/shared/MobileCard";
import { fmtDate } from "@/utils/formatters";
import { dateInputCls as inputCls } from "@/utils/constants";

const TAB_OVERVIEW = "overview";
const TAB_PURCHASES = "purchases";
const TAB_SALES = "sales";
const TAB_STATEMENT = "statement";

const getMonthRange = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(y, date.getMonth() + 1, 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
};

const DateRangeFilter = ({ from, to, onChange }) => (
  <div className="flex flex-wrap items-center gap-2">
    <Calendar size={14} className="text-surface-400" />
    <input
      type="date"
      value={from}
      onChange={(e) => onChange({ from: e.target.value, to })}
      className={inputCls}
    />
    <span className="text-surface-500 text-sm">to</span>
    <input
      type="date"
      value={to}
      onChange={(e) => onChange({ from, to: e.target.value })}
      className={inputCls}
    />
    <button
      onClick={() => onChange(getMonthRange())}
      className="px-3 py-1.5 text-xs rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors"
    >
      This Month
    </button>
  </div>
);

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
const fmtD = (n) =>
  Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
// ─── Metric Card ──────────────────────────────────────────────────────────────

const MetricCard = ({
  label,
  value,
  sub,
  icon: Icon,
  color = "primary",
  trend,
}) => (
  <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2 rounded-lg bg-${color}-500/15`}>
        <Icon size={18} className={`text-${color}-400`} />
      </div>
      {trend !== undefined &&
        (trend >= 0 ? (
          <TrendingUp size={14} className="text-green-400" />
        ) : (
          <TrendingDown size={14} className="text-red-400" />
        ))}
    </div>
    <p className="text-surface-400 text-xs mb-1">{label}</p>
    <p className="text-xl font-bold text-white">{value}</p>
    {sub && <p className="text-surface-500 text-xs mt-1">{sub}</p>}
  </div>
);

// ─── Overview Tab ─────────────────────────────────────────────────────────────

const OverviewTab = ({ product, metrics }) => {
  const margin = metrics?.profit_margin ?? 0;
  const marginColor = margin >= 50 ? "green" : margin >= 25 ? "yellow" : "red";

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Current Stock"
          value={metrics?.current_stock ?? product?.current_stock ?? 0}
          sub={`${product?.unit || "units"}`}
          icon={Package}
          color={
            metrics?.current_stock === 0
              ? "red"
              : product?.reorder_level > 0 &&
                  metrics?.current_stock <= product.reorder_level
                ? "yellow"
                : "green"
          }
        />
        <MetricCard
          label="Total Revenue"
          value={`KSh ${fmt(metrics?.total_revenue)}`}
          sub={`${fmt(metrics?.total_units_sold)} units sold`}
          icon={DollarSign}
          color="primary"
        />
        <MetricCard
          label="Gross Profit"
          value={`KSh ${fmt(metrics?.gross_profit)}`}
          sub={`Margin: ${fmtD(metrics?.profit_margin)}%`}
          icon={TrendingUp}
          color={marginColor}
          trend={metrics?.gross_profit}
        />
        <MetricCard
          label="Avg Daily Sales"
          value={`${fmtD(metrics?.avg_daily_sales)} ${product?.unit || "units"}/day`}
          sub={
            metrics?.days_of_stock_remaining != null
              ? `~${metrics.days_of_stock_remaining} days of stock left`
              : "Insufficient data"
          }
          icon={Clock}
          color="blue"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
          <p className="text-surface-400 text-xs mb-2">Units Purchased</p>
          <p className="text-lg font-bold text-white">
            {fmt(metrics?.total_units_purchased)}
          </p>
          <p className="text-surface-500 text-xs mt-1">
            Avg cost KSh {fmtD(metrics?.avg_cost_price)}
          </p>
        </div>
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
          <p className="text-surface-400 text-xs mb-2">Cost of Goods Sold</p>
          <p className="text-lg font-bold text-white">
            KSh {fmt(metrics?.total_cogs)}
          </p>
          <p className="text-surface-500 text-xs mt-1">
            Based on avg cost price
          </p>
        </div>
        <div
          className={`bg-surface-800 rounded-xl border p-4 ${
            metrics?.days_of_stock_remaining != null &&
            metrics.days_of_stock_remaining <= 7
              ? "border-yellow-500/40"
              : "border-surface-700"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <p className="text-surface-400 text-xs">Estimated Shelf Life</p>
            {metrics?.days_of_stock_remaining != null &&
              metrics.days_of_stock_remaining <= 7 && (
                <AlertTriangle size={12} className="text-yellow-400" />
              )}
          </div>
          <p className="text-lg font-bold text-white">
            {metrics?.days_of_stock_remaining != null
              ? `${metrics.days_of_stock_remaining} days`
              : "N/A"}
          </p>
          <p className="text-surface-500 text-xs mt-1">At current sales rate</p>
        </div>
      </div>

      {/* Product info */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
        <h3 className="font-semibold text-white mb-4">Product Details</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {[
            { label: "Selling Price", value: `KSh ${fmtD(product?.price)}` },
            {
              label: "Cost Price",
              value: product?.cost_price
                ? `KSh ${fmtD(product.cost_price)}`
                : "Not set",
            },
            {
              label: "Category",
              value: product?.categories?.name || product?.category_name || "—",
            },
            { label: "Unit", value: product?.unit || "—" },
            {
              label: "Track Inventory",
              value: product?.track_inventory ? "Yes" : "No",
            },
            { label: "Status", value: product?.active ? "Active" : "Inactive" },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-surface-400 text-xs mb-0.5">{label}</dt>
              <dd className="text-white font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

const HISTORY_PAGE_SIZE = 10;

const daysOutstanding = (purchaseDate) => {
  if (!purchaseDate) return null;
  return Math.floor((Date.now() - new Date(purchaseDate).getTime()) / 86400000);
};

const PaymentBadge = ({ paidAt, status, purchaseDate }) => {
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
        <XCircle size={10} />
        Cancelled
      </span>
    );
  }
  if (paidAt) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
        <CheckCircle2 size={10} />
        Paid
      </span>
    );
  }
  const days = daysOutstanding(purchaseDate);
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
      <Clock size={10} />
      {days != null ? `${days}d` : "Pending"}
    </span>
  );
};

const HistorySortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col)
    return <ChevronUp size={11} className="opacity-30 ml-1 inline" />;
  return sortDir === "asc" ? (
    <ChevronUp size={11} className="ml-1 inline" />
  ) : (
    <ChevronDown size={11} className="ml-1 inline" />
  );
};

const HistoryPagination = ({ page, totalPages, setPage }) =>
  totalPages > 1 ? (
    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
      <p className="text-xs text-surface-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="px-3 text-xs text-surface-400">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  ) : null;

// ─── Purchase History Tab ─────────────────────────────────────────────────────

const PurchasesTab = ({ productId, dateRange }) => {
  const navigate = useNavigate();
  const { data: purchases = [], isLoading } = useProductPurchaseHistory(
    productId,
    dateRange,
  );
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir(col === "date" ? "desc" : "asc");
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    return [...purchases].sort((a, b) => {
      let av, bv;
      switch (sortCol) {
        case "date":
          av = a.inventory_receipts?.purchase_date || "";
          bv = b.inventory_receipts?.purchase_date || "";
          break;
        case "invoice":
          av = a.inventory_receipts?.invoice_number || "";
          bv = b.inventory_receipts?.invoice_number || "";
          break;
        case "supplier":
          av = a.inventory_receipts?.suppliers?.name || "";
          bv = b.inventory_receipts?.suppliers?.name || "";
          break;
        case "qty":
          av = a.quantity || 0;
          bv = b.quantity || 0;
          break;
        case "unit_cost":
          av = a.unit_cost || 0;
          bv = b.unit_cost || 0;
          break;
        case "total":
          av = a.line_total || 0;
          bv = b.line_total || 0;
          break;
        default:
          return 0;
      }
      if (typeof av === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [purchases, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / HISTORY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice(
    (safePage - 1) * HISTORY_PAGE_SIZE,
    safePage * HISTORY_PAGE_SIZE,
  );

  if (isLoading)
    return <p className="text-surface-400 text-sm py-4">Loading…</p>;
  if (purchases.length === 0)
    return (
      <p className="text-surface-400 text-sm py-4">
        No purchase records found.
      </p>
    );

  const PCOLS = [
    { key: "date", label: "Date", align: "left" },
    { key: "invoice", label: "Invoice", align: "left", hidden: true },
    { key: "supplier", label: "Supplier", align: "left" },
    { key: "qty", label: "Qty", align: "right" },
    { key: "unit_cost", label: "Unit Cost", align: "right" },
    { key: "total", label: "Total", align: "right" },
    { key: "_status", label: "Status", align: "center", noSort: true },
  ];

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
            <tr>
              {PCOLS.map(({ key, label, align, hidden, noSort }) => (
                <th
                  key={key}
                  onClick={() => !noSort && handleSort(key)}
                  className={`px-4 py-3 text-${align} ${noSort ? "" : "cursor-pointer select-none hover:text-white"} transition-colors${hidden ? " hidden sm:table-cell" : ""}`}
                >
                  {label}
                  {!noSort && (
                    <HistorySortIcon
                      col={key}
                      sortCol={sortCol}
                      sortDir={sortDir}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {pageItems.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-surface-700/50 transition-colors"
              >
                <td className="px-4 py-3 text-surface-300 whitespace-nowrap">
                  {fmtDate(item.inventory_receipts?.purchase_date)}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {item.inventory_receipts?.id ? (
                    <button
                      onClick={() =>
                        navigate(
                          `/inventory/receipts/${item.inventory_receipts.id}`,
                        )
                      }
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-primary-400 hover:text-primary-300 transition-colors group"
                    >
                      {item.inventory_receipts.invoice_number || "—"}
                      <ExternalLink
                        size={10}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </button>
                  ) : (
                    <span className="text-surface-400 font-mono text-xs">
                      {item.inventory_receipts?.invoice_number || "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-white">
                  {item.inventory_receipts?.suppliers?.name || "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-white">
                  {item.quantity}
                </td>
                <td className="px-4 py-3 text-right font-mono text-surface-300">
                  KSh {fmtD(item.unit_cost)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-primary-400">
                  KSh {fmtD(item.line_total)}
                </td>
                <td className="px-4 py-3 text-center">
                  <PaymentBadge
                    paidAt={item.inventory_receipts?.paid_at}
                    status={item.inventory_receipts?.status}
                    purchaseDate={item.inventory_receipts?.purchase_date}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface-900 font-semibold">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-surface-400 text-xs">
                Total (
                {
                  purchases.filter(
                    (p) => p.inventory_receipts?.status !== "cancelled",
                  ).length
                }{" "}
                records)
              </td>
              <td className="px-4 py-2 text-right font-mono text-white text-xs">
                {purchases
                  .filter((p) => p.inventory_receipts?.status !== "cancelled")
                  .reduce((s, p) => s + (p.quantity || 0), 0)}
              </td>
              <td />
              <td className="px-4 py-2 text-right font-mono text-primary-400 text-xs">
                KSh{" "}
                {fmtD(
                  purchases
                    .filter((p) => p.inventory_receipts?.status !== "cancelled")
                    .reduce((s, p) => s + (p.line_total || 0), 0),
                )}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <MobileCardList>
        {pageItems.map((item) => (
          <MobileCard key={item.id}>
            <div className="flex items-center justify-between">
              <span className="text-surface-300 text-sm">
                {fmtDate(item.inventory_receipts?.purchase_date)}
              </span>
              <PaymentBadge
                paidAt={item.inventory_receipts?.paid_at}
                status={item.inventory_receipts?.status}
                purchaseDate={item.inventory_receipts?.purchase_date}
              />
            </div>
            <div className="text-white font-medium text-sm">
              {item.inventory_receipts?.suppliers?.name || "—"}
            </div>
            {item.inventory_receipts?.invoice_number && (
              <div className="font-mono text-xs text-primary-400">
                {item.inventory_receipts.invoice_number}
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-400">
                Qty:{" "}
                <span className="text-white font-mono">{item.quantity}</span> ×{" "}
                <span className="text-surface-300 font-mono">
                  KSh {fmtD(item.unit_cost)}
                </span>
              </span>
              <span className="text-primary-400 font-semibold font-mono">
                KSh {fmtD(item.line_total)}
              </span>
            </div>
          </MobileCard>
        ))}
        <MobileCard className="bg-surface-900/50!">
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-400">
              Total (
              {
                purchases.filter(
                  (p) => p.inventory_receipts?.status !== "cancelled",
                ).length
              }{" "}
              records) · Qty:{" "}
              <span className="text-white font-mono">
                {purchases
                  .filter((p) => p.inventory_receipts?.status !== "cancelled")
                  .reduce((s, p) => s + (p.quantity || 0), 0)}
              </span>
            </span>
            <span className="text-primary-400 font-semibold font-mono">
              KSh{" "}
              {fmtD(
                purchases
                  .filter((p) => p.inventory_receipts?.status !== "cancelled")
                  .reduce((s, p) => s + (p.line_total || 0), 0),
              )}
            </span>
          </div>
        </MobileCard>
      </MobileCardList>

      <HistoryPagination
        page={safePage}
        totalPages={totalPages}
        setPage={setPage}
      />
    </div>
  );
};

// ─── Bill Receipt Modal ───────────────────────────────────────────────────────

const BillReceiptModal = ({ billId, onClose }) => {
  const { data: bill, isLoading } = useBill(billId);

  const allItems = useMemo(() => {
    if (!bill?.rounds) return [];
    return bill.rounds.flatMap((r) =>
      (r.round_items || []).map((ri) => ({
        ...ri,
        round_number: r.round_number,
      })),
    );
  }, [bill]);

  const total = useMemo(
    () => allItems.reduce((s, i) => s + (i.quantity || 0) * (i.price || 0), 0),
    [allItems],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h2 className="font-semibold text-white text-sm">Bill Receipt</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-surface-400 text-sm p-6 text-center">Loading…</p>
        ) : !bill ? (
          <p className="text-surface-400 text-sm p-6 text-center">
            Bill not found.
          </p>
        ) : (
          <div className="p-5 space-y-4">
            {/* Bill info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-400">Bill ID</span>
                <span className="text-white font-mono text-xs">{bill.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Customer</span>
                <span className="text-white">{bill.customer_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Status</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    bill.status === "completed"
                      ? "bg-green-500/20 text-green-400"
                      : bill.status === "void"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {bill.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-400">Date</span>
                <span className="text-white">{fmtDate(bill.created_at)}</span>
              </div>
            </div>

            <div className="border-t border-surface-700" />

            {/* Items */}
            <div>
              <p className="text-surface-400 text-xs uppercase tracking-wide mb-3">Items</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-surface-500 border-b border-surface-700">
                    <th className="pb-2 text-left font-medium">Item</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Price</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-b border-surface-700/50 ${idx % 2 === 0 ? "" : "bg-surface-900/30"}`}
                    >
                      <td className="py-2.5 pr-3">
                        <p className="text-white font-medium">{item.product?.name || "Unknown"}</p>
                        <p className="text-surface-500 mt-0.5">Round {item.round_number}</p>
                      </td>
                      <td className="py-2.5 text-right font-mono text-surface-300">{item.quantity}</td>
                      <td className="py-2.5 text-right font-mono text-surface-300">KSh {fmtD(item.price)}</td>
                      <td className="py-2.5 text-right font-mono text-white font-semibold">
                        KSh {fmtD((item.quantity || 0) * (item.price || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-surface-700" />

            {/* Total */}
            <div className="flex justify-between font-semibold text-sm">
              <span className="text-surface-300">Total</span>
              <span className="text-primary-400 font-mono">
                KSh {fmtD(total)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Invoice Modal ────────────────────────────────────────────────────────────

const InvoiceModal = ({ receiptId, onClose }) => {
  const { data: receipt, isLoading } = useReceiptDetail(receiptId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h2 className="font-semibold text-white text-sm">Purchase Invoice</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-surface-400 text-sm p-6 text-center">Loading…</p>
        ) : !receipt ? (
          <p className="text-surface-400 text-sm p-6 text-center">
            Invoice not found.
          </p>
        ) : (
          <div className="p-5 space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-surface-400 text-xs mb-0.5">Supplier</p>
                <p className="text-white font-medium">
                  {receipt.supplier?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-surface-400 text-xs mb-0.5">Invoice #</p>
                <p className="text-white font-mono">{receipt.invoice_number}</p>
              </div>
              <div>
                <p className="text-surface-400 text-xs mb-0.5">Purchase Date</p>
                <p className="text-white">{fmtDate(receipt.purchase_date)}</p>
              </div>
              <div>
                <p className="text-surface-400 text-xs mb-0.5">Status</p>
                <span
                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                    receipt.status === "paid"
                      ? "bg-green-500/20 text-green-400"
                      : receipt.status === "cancelled"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {receipt.status}
                </span>
              </div>
            </div>

            {receipt.notes && (
              <p className="text-surface-400 text-xs italic">{receipt.notes}</p>
            )}

            <div className="border-t border-surface-700" />

            {/* Items table */}
            <div>
              <p className="text-surface-400 text-xs uppercase tracking-wide mb-3">
                Items
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-surface-500 border-b border-surface-700">
                    <th className="pb-2 text-left font-medium">Item</th>
                    <th className="pb-2 text-left font-medium">Unit</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Unit Price</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(receipt.inventory_receipt_items || []).map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-b border-surface-700/50 ${idx % 2 === 0 ? "" : "bg-surface-900/30"}`}
                    >
                      <td className="py-2.5 pr-3 text-white font-medium">{item.products?.name || "Unknown"}</td>
                      <td className="py-2.5 text-surface-400">{item.products?.unit || "—"}</td>
                      <td className="py-2.5 text-right font-mono text-surface-300">{item.quantity}</td>
                      <td className="py-2.5 text-right font-mono text-surface-300">KSh {fmtD(item.unit_cost)}</td>
                      <td className="py-2.5 text-right font-mono text-white font-semibold">KSh {fmtD(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-surface-700" />

            <div className="flex justify-between font-semibold text-sm">
              <span className="text-surface-300">Total</span>
              <span className="text-primary-400 font-mono">
                KSh {fmtD(receipt.total_amount)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Stock Take Modal ─────────────────────────────────────────────────────────

const REASON_LABELS = {
  receiving_error: "Receiving Error",
  count_mistake: "Count Mistake",
  damaged_broken: "Damaged / Broken",
  theft_shortage: "Theft / Shortage",
  spillage_waste: "Spillage / Waste",
  expired_product: "Expired Product",
  system_error: "System Error",
  transfer: "Transfer",
  other: "Other",
};

const StockTakeModal = ({ stockTakeId, productId, onClose }) => {
  const { data: st, isLoading } = useStockTakeDetail(stockTakeId);
  const item = st?.stock_take_items?.find((i) => i.product_id === productId) ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-surface-800 rounded-2xl border border-surface-700 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h2 className="font-semibold text-white text-sm truncate pr-4">
            {isLoading ? "Loading…" : (st?.stock_take_name || "Stock Take")}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 p-1 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-surface-400 text-sm p-6 text-center">Loading…</p>
        ) : !st ? (
          <p className="text-surface-400 text-sm p-6 text-center">Stock take not found.</p>
        ) : (
          <div className="p-5 space-y-4">
            {/* Header details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-surface-400 text-xs mb-0.5">Conducted by</p>
                <p className="text-white font-medium">{st.profiles?.name || "—"}</p>
                <p className="text-surface-500 text-xs capitalize">{st.profiles?.role || ""}</p>
              </div>
              <div>
                <p className="text-surface-400 text-xs mb-0.5">Type</p>
                <p className="text-white capitalize">{st.stock_take_type?.replace(/_/g, " ") || "—"}</p>
              </div>
              <div>
                <p className="text-surface-400 text-xs mb-0.5">Date</p>
                <p className="text-white">{fmtDate(st.completed_at || st.created_at)}</p>
              </div>
              <div>
                <p className="text-surface-400 text-xs mb-0.5">Status</p>
                <span
                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                    st.approval_status === "approved"
                      ? "bg-green-500/20 text-green-400"
                      : st.approval_status === "rejected"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {st.approval_status}
                </span>
              </div>
              {st.location && (
                <div className="col-span-2">
                  <p className="text-surface-400 text-xs mb-0.5">Location</p>
                  <p className="text-white">{st.location}</p>
                </div>
              )}
            </div>

            <div className="border-t border-surface-700" />

            {/* This product's record */}
            {!item ? (
              <p className="text-surface-500 text-xs text-center py-2">No record for this product in this stock take.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-surface-400 text-xs uppercase tracking-wide">Product Record</p>

                <div className="bg-surface-900 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-surface-500 text-xs mb-1">System Qty</p>
                      <p className="text-white font-mono font-semibold text-lg">{item.system_qty ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-surface-500 text-xs mb-1">Physical Qty</p>
                      <p className="text-white font-mono font-semibold text-lg">{item.physical_qty ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-surface-500 text-xs mb-1">Variance</p>
                      <p className={`font-mono font-semibold text-lg ${
                        (item.variance ?? 0) > 0 ? "text-green-400" : (item.variance ?? 0) < 0 ? "text-red-400" : "text-surface-400"
                      }`}>
                        {(item.variance ?? 0) > 0 ? "+" : ""}{item.variance ?? "—"}
                      </p>
                    </div>
                  </div>

                  {item.total_value_adjustment != null && (
                    <div className="flex justify-between text-sm border-t border-surface-700 pt-3">
                      <span className="text-surface-400">Value Adjustment</span>
                      <span className={`font-mono font-semibold ${
                        item.total_value_adjustment < 0 ? "text-red-400" : "text-green-400"
                      }`}>
                        {item.total_value_adjustment > 0 ? "+" : ""}KSh {fmtD(Math.abs(item.total_value_adjustment))}
                      </span>
                    </div>
                  )}
                </div>

                {item.reason && (
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-400">Reason</span>
                    <span className="text-white">{REASON_LABELS[item.reason] ?? item.reason}</span>
                  </div>
                )}
                {item.notes && (
                  <p className="text-surface-500 text-xs italic border-l-2 border-surface-600 pl-3">{item.notes}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sales History Tab ────────────────────────────────────────────────────────

const SalesTab = ({ productId, dateRange }) => {
  const { data: sales = [], isLoading } = useProductSalesHistory(
    productId,
    dateRange,
  );
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [receiptBillId, setReceiptBillId] = useState(null);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir(col === "date" ? "desc" : "asc");
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    return [...sales].sort((a, b) => {
      let av, bv;
      switch (sortCol) {
        case "date":
          av = a.sale_date || "";
          bv = b.sale_date || "";
          break;
        case "customer":
          av = a.customer_name || "";
          bv = b.customer_name || "";
          break;
        case "bill":
          av = String(a.bill_id || "");
          bv = String(b.bill_id || "");
          break;
        case "qty":
          av = a.quantity || 0;
          bv = b.quantity || 0;
          break;
        case "price":
          av = a.price || 0;
          bv = b.price || 0;
          break;
        case "revenue":
          av = (a.quantity || 0) * (a.price || 0);
          bv = (b.quantity || 0) * (b.price || 0);
          break;
        default:
          return 0;
      }
      if (typeof av === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [sales, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / HISTORY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice(
    (safePage - 1) * HISTORY_PAGE_SIZE,
    safePage * HISTORY_PAGE_SIZE,
  );

  if (isLoading)
    return <p className="text-surface-400 text-sm py-4">Loading…</p>;
  if (sales.length === 0)
    return (
      <p className="text-surface-400 text-sm py-4">No sales records found.</p>
    );

  const SCOLS = [
    { key: "date", label: "Date", align: "left" },
    { key: "customer", label: "Customer", align: "left", hidden: true },
    { key: "bill", label: "Bill", align: "left", hidden: true },
    { key: "qty", label: "Qty", align: "right" },
    { key: "price", label: "Unit Price", align: "right" },
    { key: "revenue", label: "Revenue", align: "right" },
  ];

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
            <tr>
              {SCOLS.map(({ key, label, align, hidden }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-4 py-3 text-${align} cursor-pointer select-none hover:text-white transition-colors${hidden ? " hidden sm:table-cell" : ""}`}
                >
                  {label}
                  <HistorySortIcon
                    col={key}
                    sortCol={sortCol}
                    sortDir={sortDir}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {pageItems.map((item) => {
              const revenue = (item.quantity || 0) * (item.price || 0);
              return (
                <tr
                  key={item.id}
                  className="hover:bg-surface-700/50 transition-colors"
                >
                  <td className="px-4 py-3 text-surface-300 whitespace-nowrap">
                    {fmtDate(item.sale_date)}
                  </td>
                  <td className="px-4 py-3 text-surface-400 hidden sm:table-cell">
                    {item.customer_name || (
                      <span className="text-surface-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {item.bill_id ? (
                      <button
                        onClick={() => setReceiptBillId(item.bill_id)}
                        className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors text-xs font-mono"
                      >
                        <ExternalLink size={11} />
                        {item.bill_id.slice(0, 8)}…
                      </button>
                    ) : (
                      <span className="text-surface-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-surface-300">
                    KSh {fmtD(item.price)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-green-400">
                    KSh {fmtD(revenue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-surface-900 font-semibold">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-surface-400 text-xs">
                Total ({sales.length} records)
              </td>
              <td className="px-4 py-2 text-right font-mono text-white text-xs">
                {sales.reduce((s, r) => s + (r.quantity || 0), 0)}
              </td>
              <td />
              <td className="px-4 py-2 text-right font-mono text-green-400 text-xs">
                KSh{" "}
                {fmtD(
                  sales.reduce(
                    (s, r) => s + (r.quantity || 0) * (r.price || 0),
                    0,
                  ),
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <MobileCardList>
        {pageItems.map((item) => {
          const revenue = (item.quantity || 0) * (item.price || 0);
          return (
            <MobileCard key={item.id}>
              <div className="flex items-center justify-between">
                <span className="text-surface-300 text-sm">
                  {fmtDate(item.sale_date)}
                </span>
                <span className="text-green-400 font-semibold font-mono text-sm">
                  KSh {fmtD(revenue)}
                </span>
              </div>
              {item.customer_name && (
                <div className="flex items-center gap-1 text-xs text-surface-400">
                  <User size={10} />
                  {item.customer_name}
                </div>
              )}
              {item.bill_id && (
                <button
                  onClick={() => setReceiptBillId(item.bill_id)}
                  className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <ExternalLink size={10} />
                  Bill# {item.bill_id.slice(0, 8)}…
                </button>
              )}
              <div className="text-xs text-surface-400">
                Qty:{" "}
                <span className="text-white font-mono">{item.quantity}</span> ×{" "}
                <span className="text-surface-300 font-mono">
                  KSh {fmtD(item.price)}
                </span>
              </div>
            </MobileCard>
          );
        })}
        <MobileCard className="bg-surface-900/50!">
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-400">
              Total ({sales.length} records) · Qty:{" "}
              <span className="text-white font-mono">
                {sales.reduce((s, r) => s + (r.quantity || 0), 0)}
              </span>
            </span>
            <span className="text-green-400 font-semibold font-mono">
              KSh{" "}
              {fmtD(
                sales.reduce(
                  (s, r) => s + (r.quantity || 0) * (r.price || 0),
                  0,
                ),
              )}
            </span>
          </div>
        </MobileCard>
      </MobileCardList>

      <HistoryPagination
        page={safePage}
        totalPages={totalPages}
        setPage={setPage}
      />

      {receiptBillId && (
        <BillReceiptModal
          billId={receiptBillId}
          onClose={() => setReceiptBillId(null)}
        />
      )}
    </div>
  );
};

// ─── Statement Tab ────────────────────────────────────────────────────────────

const movementLabel = (row) => {
  switch (row.movement_type) {
    case "purchase":
      return row.supplier_name
        ? `Purchase – ${row.supplier_name}${row.invoice_number ? ` (${row.invoice_number})` : ""}`
        : `Purchase${row.invoice_number ? ` (${row.invoice_number})` : ""}`;
    case "sale":
      return row.customer_name ? `Sale – ${row.customer_name}` : "Sale";
    case "adjustment_in":
      return `Adjustment In${row.stock_take_name ? ` – ${row.stock_take_name}` : row.reason ? ` – ${row.reason}` : ""}`;
    case "adjustment_out":
      return `Adjustment Out${row.stock_take_name ? ` – ${row.stock_take_name}` : row.reason ? ` – ${row.reason}` : ""}`;
    case "opening_balance":
      return "Opening Balance";
    default:
      return row.movement_type ?? "Movement";
  }
};

const StatementTab = ({ productId, dateRange }) => {
  const { data, isLoading } = useProductStatement(productId, dateRange);
  const [receiptBillId, setReceiptBillId] = useState(null);
  const [invoiceReceiptId, setInvoiceReceiptId] = useState(null);
  const [stockTakeId, setStockTakeId] = useState(null);

  if (isLoading)
    return <p className="text-surface-400 text-sm py-4">Loading…</p>;

  const openingBalance = data?.opening_balance ?? 0;
  const movements = data?.movements ?? [];
  const closingBalance =
    movements.length > 0
      ? movements[movements.length - 1].balance
      : openingBalance;

  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-right">Qty In</th>
              <th className="px-4 py-3 text-right">Qty Out</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {/* Opening balance row */}
            <tr className="bg-surface-900/40">
              <td className="px-4 py-3 text-surface-400 text-xs whitespace-nowrap">
                {dateRange.from}
              </td>
              <td className="px-4 py-3 text-surface-400 italic">
                Opening Balance
              </td>
              <td className="px-4 py-3 text-right" />
              <td className="px-4 py-3 text-right" />
              <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                {openingBalance}
              </td>
            </tr>

            {movements.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-surface-500 text-xs"
                >
                  No movements in this period.
                </td>
              </tr>
            ) : (
              movements.map((row) => {
                const isIn = row.quantity > 0;
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-surface-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-surface-300 whitespace-nowrap text-xs">
                      {fmtDate(row.movement_date)}
                    </td>
                    <td className="px-4 py-3 text-surface-300 max-w-xs">
                      <div className="flex items-center gap-2">
                        {row.reference_type === "inventory_receipt" ? (
                          <span className="truncate">
                            {`Purchase${row.supplier_name ? ` – ${row.supplier_name}` : ""}`}
                            {row.invoice_number && row.reference_id && (
                              <> (<button
                                onClick={() => setInvoiceReceiptId(row.reference_id)}
                                className="text-blue-400 hover:text-blue-300 hover:underline font-mono"
                              >{row.invoice_number}</button>)</>
                            )}
                          </span>
                        ) : row.reference_type === "stock_take" && row.stock_take_name && row.reference_id ? (
                          <span className="truncate">
                            {row.movement_type === "adjustment_in" ? "Adjustment In" : "Adjustment Out"} –{" "}
                            <button
                              onClick={() => setStockTakeId(row.reference_id)}
                              className="text-yellow-400 hover:text-yellow-300 hover:underline"
                            >
                              {row.stock_take_name}
                            </button>
                          </span>
                        ) : (
                          <span className="truncate">{movementLabel(row)}</span>
                        )}
                        {row.bill_id && (
                          <button
                            onClick={() => setReceiptBillId(row.bill_id)}
                            className="shrink-0 inline-flex items-center gap-0.5 text-primary-400 hover:text-primary-300 text-xs"
                          >
                            <ExternalLink size={10} />
                            Bill
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-green-400">
                      {isIn ? row.quantity : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-red-400">
                      {!isIn ? Math.abs(row.quantity) : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                      {row.balance}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Closing balance row */}
            <tr className="bg-surface-900/60 font-semibold">
              <td className="px-4 py-3 text-surface-400 text-xs">
                {dateRange.to}
              </td>
              <td className="px-4 py-3 text-surface-300">Closing Balance</td>
              <td className="px-4 py-3 text-right font-mono text-green-400 text-xs">
                {movements
                  .filter((m) => m.quantity > 0)
                  .reduce((s, m) => s + m.quantity, 0) || ""}
              </td>
              <td className="px-4 py-3 text-right font-mono text-red-400 text-xs">
                {movements
                  .filter((m) => m.quantity < 0)
                  .reduce((s, m) => s + Math.abs(m.quantity), 0) || ""}
              </td>
              <td className="px-4 py-3 text-right font-mono text-primary-400">
                {closingBalance}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <MobileCardList>
        <MobileCard className="bg-surface-900/40!">
          <div className="flex justify-between text-xs">
            <span className="text-surface-400 italic">
              Opening Balance · {dateRange.from}
            </span>
            <span className="text-white font-mono font-semibold">
              {openingBalance}
            </span>
          </div>
        </MobileCard>

        {movements.length === 0 ? (
          <MobileCard>
            <p className="text-surface-500 text-xs text-center">
              No movements in this period.
            </p>
          </MobileCard>
        ) : (
          movements.map((row) => {
            const isIn = row.quantity > 0;
            return (
              <MobileCard key={row.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-surface-300 text-sm truncate">
                      {movementLabel(row)}
                    </p>
                    <p className="text-surface-500 text-xs">
                      {fmtDate(row.movement_date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {isIn ? (
                      <span className="flex items-center gap-1 text-green-400 font-mono text-sm">
                        <ArrowUpCircle size={12} />+{row.quantity}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 font-mono text-sm">
                        <ArrowDownCircle size={12} />
                        {row.quantity}
                      </span>
                    )}
                    <span className="text-xs text-surface-400">
                      Bal:{" "}
                      <span className="text-white font-mono">
                        {row.balance}
                      </span>
                    </span>
                  </div>
                </div>
                {row.bill_id && (
                  <button
                    onClick={() => setReceiptBillId(row.bill_id)}
                    className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 mt-1"
                  >
                    <ExternalLink size={10} />
                    View Receipt
                  </button>
                )}
                {row.reference_type === "inventory_receipt" &&
                  row.reference_id &&
                  row.invoice_number && (
                    <button
                      onClick={() => setInvoiceReceiptId(row.reference_id)}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1 font-mono"
                    >
                      <ExternalLink size={10} />
                      ({row.invoice_number})
                    </button>
                  )}
                {row.reference_type === "stock_take" &&
                  row.reference_id &&
                  row.stock_take_name && (
                    <button
                      onClick={() => setStockTakeId(row.reference_id)}
                      className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 mt-1"
                    >
                      <ExternalLink size={10} />
                      {row.stock_take_name}
                    </button>
                  )}
              </MobileCard>
            );
          })
        )}

        <MobileCard className="bg-surface-900/60!">
          <div className="flex justify-between text-xs">
            <span className="text-surface-300 font-semibold">
              Closing Balance · {dateRange.to}
            </span>
            <span className="text-primary-400 font-mono font-semibold">
              {closingBalance}
            </span>
          </div>
        </MobileCard>
      </MobileCardList>

      {receiptBillId && (
        <BillReceiptModal
          billId={receiptBillId}
          onClose={() => setReceiptBillId(null)}
        />
      )}
      {invoiceReceiptId && (
        <InvoiceModal
          receiptId={invoiceReceiptId}
          onClose={() => setInvoiceReceiptId(null)}
        />
      )}
      {stockTakeId && (
        <StockTakeModal
          stockTakeId={stockTakeId}
          productId={productId}
          onClose={() => setStockTakeId(null)}
        />
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: TAB_OVERVIEW, label: "Overview", icon: BarChart2 },
  { id: TAB_PURCHASES, label: "Purchase History", icon: Truck },
  { id: TAB_SALES, label: "Sales History", icon: ShoppingCart },
  { id: TAB_STATEMENT, label: "Statement", icon: FileText },
];

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TAB_OVERVIEW);
  const [dateRange, setDateRange] = useState(getMonthRange);

  const { data: insights, isLoading } = useProductInsights(id, dateRange);
  const product = insights?.product;
  const metrics = insights?.metrics;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-surface-400">Loading product…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <p className="text-surface-400">Product not found.</p>
        <button
          onClick={() => navigate("/products")}
          className="text-primary-400 hover:text-primary-300 text-sm"
        >
          ← Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate("/products")}
          className="mt-1 p-1.5 hover:bg-surface-700 rounded-lg text-surface-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white truncate">
              {product.name}
            </h1>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                product.active
                  ? "bg-green-500/20 text-green-400"
                  : "bg-surface-700 text-surface-400"
              }`}
            >
              {product.active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-surface-400 text-sm mt-0.5">
            {product.categories?.name || product.category_name} · {product.unit}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-primary-400">
            KSh {fmtD(product.price)}
          </p>
          <p className="text-surface-400 text-xs mt-0.5">selling price</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-surface-700">
        <div className="flex gap-1">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setActiveTab(tid)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative ${
                activeTab === tid
                  ? "text-primary-400"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
              {activeTab === tid && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
          ))}
        </div>
        <DateRangeFilter
          from={dateRange.from}
          to={dateRange.to}
          onChange={setDateRange}
        />
      </div>

      {activeTab === TAB_OVERVIEW && (
        <OverviewTab product={product} metrics={metrics} />
      )}
      {activeTab === TAB_PURCHASES && (
        <PurchasesTab productId={id} dateRange={dateRange} />
      )}
      {activeTab === TAB_SALES && (
        <SalesTab productId={id} dateRange={dateRange} />
      )}
      {activeTab === TAB_STATEMENT && (
        <StatementTab productId={id} dateRange={dateRange} />
      )}
    </div>
  );
};

export default ProductDetailPage;
