import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Star,
} from "lucide-react";
import { useAdjustmentInsights } from "@/hooks/useInventory";
import { inputCls } from "./inventoryUtils";
import { localDateStr } from "@/utils/formatters";

// ─── Trend computation ────────────────────────────────────────────────────────

const computeTrend = (history) => {
  if (!history || history.length < 2) return "new";
  const abs = history.map((h) => Math.abs(h.variance_percentage));
  if (abs.length === 2) {
    const delta = abs[1] - abs[0];
    if (delta < -2) return "improved";
    if (delta > 2) return "worsened";
    return "stable";
  }
  const mid = Math.floor(abs.length / 2);
  const firstAvg = abs.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const secondAvg = abs.slice(mid).reduce((s, v) => s + v, 0) / (abs.length - mid);
  const delta = secondAvg - firstAvg;
  if (delta < -5) return "improved";
  if (delta > 5) return "worsened";
  return "stable";
};

const TREND_META = {
  improved:  { label: "Improving",  icon: TrendingDown,  cls: "text-green-400",  bg: "bg-green-500/15",  border: "border-green-500/30" },
  worsened:  { label: "Worsening",  icon: TrendingUp,    cls: "text-red-400",    bg: "bg-red-500/15",    border: "border-red-500/30"   },
  stable:    { label: "Stable",     icon: Minus,         cls: "text-yellow-400", bg: "bg-yellow-500/15", border: "border-yellow-500/30" },
  new:       { label: "One-off",    icon: Activity,      cls: "text-surface-400",bg: "bg-surface-700",   border: "border-surface-600"  },
};

const TrendBadge = ({ trend, size = "sm" }) => {
  const { label, icon: Icon, cls, bg, border } = TREND_META[trend] ?? TREND_META.new;
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium border ${pad} ${cls} ${bg} ${border}`}>
      <Icon size={size === "sm" ? 10 : 13} />
      {label}
    </span>
  );
};

// ─── Reason labels ────────────────────────────────────────────────────────────

const REASON_LABELS = {
  receiving_error:  "Receiving Error",
  count_mistake:    "Count Mistake",
  damaged_broken:   "Damaged / Broken",
  theft_shortage:   "Theft / Shortage",
  spillage_waste:   "Spillage / Waste",
  expired_product:  "Expired Product",
  system_error:     "System Error",
  transfer:         "Transfer",
  other:            "Other",
};

// ─── History spark row ────────────────────────────────────────────────────────

const HistoryRow = ({ entry }) => {
  const isPos = entry.variance > 0;
  const date = entry.date ? new Date(entry.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit", timeZone: "Africa/Nairobi" }) : "—";
  return (
    <div className="flex items-center gap-3 py-2 border-b border-surface-700/50 last:border-0 text-xs">
      <span className="text-surface-500 w-20 shrink-0">{date}</span>
      <span className="text-surface-300 flex-1 truncate">{entry.stock_take_name || "—"}</span>
      <span className={`font-mono shrink-0 ${isPos ? "text-green-400" : "text-red-400"}`}>
        {isPos ? "+" : ""}{entry.variance}
      </span>
      <span className={`font-mono w-14 text-right shrink-0 ${isPos ? "text-green-400" : "text-red-400"}`}>
        {isPos ? "+" : ""}{Number(entry.variance_percentage).toFixed(1)}%
      </span>
      <span className="text-surface-500 w-28 text-right shrink-0">
        {entry.reason ? (REASON_LABELS[entry.reason] ?? entry.reason) : "—"}
      </span>
    </div>
  );
};

// ─── Product row ──────────────────────────────────────────────────────────────

const fmtD = (n) =>
  Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ProductRow = ({ row, rank }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const trend = computeTrend(row.adjustment_history);
  const valueImpact = Number(row.total_value_impact);
  const lastEntry = row.adjustment_history?.[row.adjustment_history.length - 1];

  return (
    <>
      <tr
        className="hover:bg-surface-700/40 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono w-5 text-center rounded ${rank <= 3 ? "text-yellow-400 font-bold" : "text-surface-500"}`}>
              {rank <= 3 ? <Star size={12} className="inline" fill="currentColor" /> : rank}
            </span>
            <div>
              <button
                className="text-white font-medium text-sm hover:text-primary-400 transition-colors text-left"
                onClick={(e) => { e.stopPropagation(); navigate(`/products/${row.product_id}`); }}
              >
                {row.product_name}
              </button>
              <p className="text-surface-500 text-xs">{row.unit}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <span className={`font-mono font-semibold text-sm ${row.adjustment_count >= 5 ? "text-red-400" : row.adjustment_count >= 3 ? "text-yellow-400" : "text-surface-300"}`}>
            {row.adjustment_count}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-mono text-sm text-surface-300">
          {Number(row.avg_variance_pct).toFixed(1)}%
        </td>
        <td className="px-4 py-3 text-right font-mono text-sm">
          <span className={valueImpact < 0 ? "text-red-400" : valueImpact > 0 ? "text-green-400" : "text-surface-500"}>
            {valueImpact > 0 ? "+" : ""}KSh {fmtD(Math.abs(valueImpact))}
          </span>
        </td>
        <td className="px-4 py-3 text-center text-xs text-surface-400">
          {lastEntry?.date
            ? new Date(lastEntry.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })
            : "—"}
        </td>
        <td className="px-4 py-3">
          <TrendBadge trend={trend} />
        </td>
        <td className="px-4 py-3 text-right">
          {expanded
            ? <ChevronUp size={14} className="text-surface-400 ml-auto" />
            : <ChevronDown size={14} className="text-surface-400 ml-auto" />}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-surface-900/50">
          <td colSpan={7} className="px-6 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-surface-400 text-xs uppercase tracking-wide">Adjustment History</p>
              <TrendBadge trend={trend} size="md" />
            </div>
            {/* History header */}
            <div className="flex items-center gap-3 pb-1 border-b border-surface-700 text-xs text-surface-500">
              <span className="w-20 shrink-0">Date</span>
              <span className="flex-1">Stock Take</span>
              <span className="shrink-0">Variance</span>
              <span className="w-14 text-right shrink-0">%</span>
              <span className="w-28 text-right shrink-0">Reason</span>
            </div>
            {(row.adjustment_history || []).map((entry, i) => (
              <HistoryRow key={i} entry={entry} />
            ))}
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Mobile product card ──────────────────────────────────────────────────────

const MobileProductCard = ({ row, rank }) => {
  const navigate = useNavigate();
  const trend = row.trend;
  const valueImpact = Number(row.total_value_impact);
  return (
    <div className="bg-surface-800 rounded-xl border border-surface-700 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <button
            className="text-white font-semibold text-sm hover:text-primary-400 text-left"
            onClick={() => navigate(`/products/${row.product_id}`)}
          >
            {rank <= 3 && <Star size={11} className="inline text-yellow-400 mr-1" fill="currentColor" />}
            {row.product_name}
          </button>
          <p className="text-surface-500 text-xs">{row.unit}</p>
        </div>
        <TrendBadge trend={trend} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="text-surface-500 mb-0.5">Adjustments</p>
          <p className={`font-mono font-bold ${row.adjustment_count >= 5 ? "text-red-400" : row.adjustment_count >= 3 ? "text-yellow-400" : "text-white"}`}>
            {row.adjustment_count}
          </p>
        </div>
        <div>
          <p className="text-surface-500 mb-0.5">Avg Variance</p>
          <p className="font-mono text-surface-300">{Number(row.avg_variance_pct).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-surface-500 mb-0.5">Value Impact</p>
          <p className={`font-mono ${valueImpact < 0 ? "text-red-400" : valueImpact > 0 ? "text-green-400" : "text-surface-400"}`}>
            {valueImpact > 0 ? "+" : ""}KSh {fmtD(Math.abs(valueImpact))}
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Summary cards ────────────────────────────────────────────────────────────

const SummaryCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className={`bg-surface-800 rounded-xl border border-surface-700 p-4`}>
    <div className={`inline-flex p-2 rounded-lg mb-3 bg-${color}-500/15`}>
      <Icon size={16} className={`text-${color}-400`} />
    </div>
    <p className="text-surface-400 text-xs mb-0.5">{label}</p>
    <p className="text-white font-bold text-xl">{value}</p>
    {sub && <p className="text-surface-500 text-xs mt-1">{sub}</p>}
  </div>
);

// ─── Main tab ─────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: "count",   label: "Most Adjustments" },
  { key: "variance", label: "Highest Avg Variance" },
  { key: "impact",  label: "Largest Value Impact" },
];

const AdjustmentInsightsTab = () => {
  const [startDate, setStartDate] = useState(() => `${localDateStr().slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(() => localDateStr());
  const [sortKey, setSortKey] = useState("count");
  const [trendFilter, setTrendFilter] = useState(null);

  const params = useMemo(() => {
    const p = {};
    if (startDate) p.startDate = startDate;
    if (endDate) p.endDate = endDate;
    return p;
  }, [startDate, endDate]);

  const { data: raw = [], isLoading } = useAdjustmentInsights(params);

  const enriched = useMemo(() =>
    raw.map((row) => ({ ...row, trend: computeTrend(row.adjustment_history) })),
    [raw]
  );

  const summary = useMemo(() => {
    const improved  = enriched.filter((r) => r.trend === "improved").length;
    const worsened  = enriched.filter((r) => r.trend === "worsened").length;
    const topCount  = enriched[0]?.adjustment_count ?? 0;
    const topName   = enriched[0]?.product_name ?? "—";
    return { improved, worsened, topCount, topName, total: enriched.length };
  }, [enriched]);

  const sorted = useMemo(() => {
    let list = trendFilter ? enriched.filter((r) => r.trend === trendFilter) : enriched;
    return [...list].sort((a, b) => {
      if (sortKey === "count")   return b.adjustment_count - a.adjustment_count;
      if (sortKey === "variance") return Number(b.avg_variance_pct) - Number(a.avg_variance_pct);
      if (sortKey === "impact")  return Math.abs(Number(b.total_value_impact)) - Math.abs(Number(a.total_value_impact));
      return 0;
    });
  }, [enriched, sortKey, trendFilter]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-surface-400 text-xs">From</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          <span className="text-surface-500 text-xs">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="text-xs text-surface-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-surface-500 text-xs">Sort:</span>
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setSortKey(o.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                sortKey === o.key
                  ? "bg-primary-500/20 text-primary-400 border border-primary-500/30"
                  : "bg-surface-700 text-surface-400 hover:text-white"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-surface-400 text-sm py-8 text-center">Loading insights…</p>
      ) : raw.length === 0 ? (
        <div className="text-center py-12 text-surface-500">
          <Activity size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No approved stock take adjustments found.</p>
          <p className="text-xs mt-1">Adjustments appear here once a stock take is approved and applied.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              label="Products Tracked"
              value={summary.total}
              sub="with recorded adjustments"
              icon={Activity}
              color="primary"
            />
            <SummaryCard
              label="Most Adjusted"
              value={summary.topCount}
              sub={summary.topName}
              icon={AlertTriangle}
              color="yellow"
            />
            <SummaryCard
              label="Improving"
              value={summary.improved}
              sub="variance trending down"
              icon={CheckCircle2}
              color="green"
            />
            <SummaryCard
              label="Worsening"
              value={summary.worsened}
              sub="variance trending up"
              icon={AlertTriangle}
              color="red"
            />
          </div>

          {/* Trend filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-surface-500 text-xs">Filter:</span>
            {[null, "worsened", "improved", "stable", "new"].map((t) => {
              const meta = t ? TREND_META[t] : null;
              const active = trendFilter === t;
              return (
                <button
                  key={t ?? "all"}
                  onClick={() => setTrendFilter(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    active
                      ? "bg-primary-500/20 text-primary-400 border-primary-500/30"
                      : "bg-surface-800 text-surface-400 border-surface-700 hover:text-white"
                  }`}
                >
                  {t ? meta.label : "All"}
                </button>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-center"># Adjustments</th>
                  <th className="px-4 py-3 text-right">Avg Variance %</th>
                  <th className="px-4 py-3 text-right">Value Impact</th>
                  <th className="px-4 py-3 text-center">Last Adjusted</th>
                  <th className="px-4 py-3 text-left">Trend</th>
                  <th className="px-4 py-3 w-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                {sorted.map((row, i) => (
                  <ProductRow key={row.product_id} row={row} rank={i + 1} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sorted.map((row, i) => (
              <MobileProductCard key={row.product_id} row={row} rank={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdjustmentInsightsTab;
