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
} from "lucide-react";
import {
  useProductInsights,
  useProductPurchaseHistory,
  useProductSalesHistory,
} from "@/hooks/useProducts";
import { MobileCard, MobileCardList } from "@/components/shared/MobileCard";

const TAB_OVERVIEW = "overview";
const TAB_PURCHASES = "purchases";
const TAB_SALES = "sales";

const inputCls =
  "px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

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
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

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
              : metrics?.current_stock <= 5
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

const PaymentBadge = ({ paidAt, purchaseDate }) => {
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
  const { data: purchases = [], isLoading } =
    useProductPurchaseHistory(productId, dateRange);
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
                    purchaseDate={item.inventory_receipts?.purchase_date}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface-900 font-semibold">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-surface-400 text-xs">
                Total ({purchases.length} records)
              </td>
              <td className="px-4 py-2 text-right font-mono text-white text-xs">
                {purchases.reduce((s, p) => s + (p.quantity || 0), 0)}
              </td>
              <td />
              <td className="px-4 py-2 text-right font-mono text-primary-400 text-xs">
                KSh {fmtD(purchases.reduce((s, p) => s + (p.line_total || 0), 0))}
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
              <span className="text-surface-300 text-sm">{fmtDate(item.inventory_receipts?.purchase_date)}</span>
              <PaymentBadge paidAt={item.inventory_receipts?.paid_at} purchaseDate={item.inventory_receipts?.purchase_date} />
            </div>
            <div className="text-white font-medium text-sm">{item.inventory_receipts?.suppliers?.name || "—"}</div>
            {item.inventory_receipts?.invoice_number && (
              <div className="font-mono text-xs text-primary-400">{item.inventory_receipts.invoice_number}</div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-400">Qty: <span className="text-white font-mono">{item.quantity}</span> × <span className="text-surface-300 font-mono">KSh {fmtD(item.unit_cost)}</span></span>
              <span className="text-primary-400 font-semibold font-mono">KSh {fmtD(item.line_total)}</span>
            </div>
          </MobileCard>
        ))}
        <MobileCard className="bg-surface-900/50!">
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-400">Total ({purchases.length} records) · Qty: <span className="text-white font-mono">{purchases.reduce((s, p) => s + (p.quantity || 0), 0)}</span></span>
            <span className="text-primary-400 font-semibold font-mono">KSh {fmtD(purchases.reduce((s, p) => s + (p.line_total || 0), 0))}</span>
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

// ─── Sales History Tab ────────────────────────────────────────────────────────

const SalesTab = ({ productId, dateRange }) => {
  const { data: sales = [], isLoading } = useProductSalesHistory(productId, dateRange);
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
    return [...sales].sort((a, b) => {
      let av, bv;
      switch (sortCol) {
        case "date":
          av = a.sale_date || "";
          bv = b.sale_date || "";
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
                    Bill# {item.bill_id ?? "—"}
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
              <td colSpan={2} className="px-4 py-2 text-surface-400 text-xs">
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
                <span className="text-surface-300 text-sm">{fmtDate(item.sale_date)}</span>
                <span className="text-green-400 font-semibold font-mono text-sm">KSh {fmtD(revenue)}</span>
              </div>
              {item.bill_id && <div className="text-xs text-surface-400">Bill# {item.bill_id}</div>}
              <div className="text-xs text-surface-400">
                Qty: <span className="text-white font-mono">{item.quantity}</span> × <span className="text-surface-300 font-mono">KSh {fmtD(item.price)}</span>
              </div>
            </MobileCard>
          );
        })}
        <MobileCard className="bg-surface-900/50!">
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-400">Total ({sales.length} records) · Qty: <span className="text-white font-mono">{sales.reduce((s, r) => s + (r.quantity || 0), 0)}</span></span>
            <span className="text-green-400 font-semibold font-mono">KSh {fmtD(sales.reduce((s, r) => s + (r.quantity || 0) * (r.price || 0), 0))}</span>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: TAB_OVERVIEW, label: "Overview", icon: BarChart2 },
  { id: TAB_PURCHASES, label: "Purchase History", icon: Truck },
  { id: TAB_SALES, label: "Sales History", icon: ShoppingCart },
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
    </div>
  );
};

export default ProductDetailPage;
