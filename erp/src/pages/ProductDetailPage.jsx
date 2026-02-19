import { useState } from "react";
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
  Icon,
} from "lucide-react";
import {
  useProductInsights,
  useProductPurchaseHistory,
  useProductSalesHistory,
} from "@/hooks/useProducts";

const TAB_OVERVIEW = "overview";
const TAB_PURCHASES = "purchases";
const TAB_SALES = "sales";

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

// ─── Purchase History Tab ─────────────────────────────────────────────────────

const PurchasesTab = ({ productId }) => {
  const { data: purchases = [], isLoading } =
    useProductPurchaseHistory(productId);

  if (isLoading)
    return <p className="text-surface-400 text-sm py-4">Loading…</p>;
  if (purchases.length === 0)
    return (
      <p className="text-surface-400 text-sm py-4">
        No purchase records found.
      </p>
    );

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
          <tr>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">
              Invoice
            </th>
            <th className="px-4 py-3 text-left">Supplier</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3 text-right">Unit Cost</th>
            <th className="px-4 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-700">
          {purchases.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-surface-700/50 transition-colors"
            >
              <td className="px-4 py-3 text-surface-300 whitespace-nowrap">
                {fmtDate(item.inventory_receipts?.purchase_date)}
              </td>
              <td className="px-4 py-3 text-surface-400 hidden sm:table-cell">
                {item.inventory_receipts?.invoice_number || "—"}
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
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-surface-900 font-semibold">
          <tr>
            <td colSpan={3} className="px-4 py-2 text-surface-400 text-xs">
              Total
            </td>
            <td className="px-4 py-2 text-right font-mono text-white text-xs">
              {purchases.reduce((s, p) => s + (p.quantity || 0), 0)}
            </td>
            <td />
            <td className="px-4 py-2 text-right font-mono text-primary-400 text-xs">
              KSh {fmtD(purchases.reduce((s, p) => s + (p.line_total || 0), 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ─── Sales History Tab ────────────────────────────────────────────────────────

const SalesTab = ({ productId }) => {
  const { data: sales = [], isLoading } = useProductSalesHistory(productId);

  if (isLoading)
    return <p className="text-surface-400 text-sm py-4">Loading…</p>;
  if (sales.length === 0)
    return (
      <p className="text-surface-400 text-sm py-4">No sales records found.</p>
    );

  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
          <tr>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">Bill</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3 text-right">Unit Price</th>
            <th className="px-4 py-3 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-700">
          {sales.map((item) => {
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
              Total
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

  const { data: insights, isLoading } = useProductInsights(id);
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
      <div className="flex gap-1 border-b border-surface-700">
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

      {activeTab === TAB_OVERVIEW && (
        <OverviewTab product={product} metrics={metrics} />
      )}
      {activeTab === TAB_PURCHASES && <PurchasesTab productId={id} />}
      {activeTab === TAB_SALES && <SalesTab productId={id} />}
    </div>
  );
};

export default ProductDetailPage;
