import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  TrendingUp,
  ShoppingCart,
  RefreshCw,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useReorderForecast } from "@/hooks/useInventory";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const fmt = (n) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
  }).format(n || 0);

const fmtQty = (n, unit) =>
  `${Number(n || 0).toFixed(1)}${unit ? ` ${unit}` : ""}`;

const LOOKBACK_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
  { label: "Last 30 days", value: 30 },
];

const FILTER_OPTIONS = [
  { key: "all", label: "All Products" },
  { key: "reorder", label: "Needs Reorder" },
  { key: "weekend", label: "Weekend Focus" },
];

const ReorderForecastTab = () => {
  const navigate = useNavigate();
  const [lookbackDays, setLookbackDays] = useState(14);
  const [filter, setFilter] = useState("reorder");
  const [search, setSearch] = useState("");

  const { data: rawItems = [], isLoading, refetch, isFetching } = useReorderForecast(lookbackDays);

  const items = useMemo(() => {
    let result = rawItems;

    if (filter === "reorder") {
      result = result.filter((i) => i.reorder_qty > 0);
    } else if (filter === "weekend") {
      // Weekend focus: weekend avg is higher than weekday avg
      result = result.filter((i) => Number(i.weekend_avg_qty) > Number(i.weekday_avg_qty));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.product_name?.toLowerCase().includes(q) ||
          i.category_name?.toLowerCase().includes(q) ||
          i.last_supplier_name?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [rawItems, filter, search]);

  const summary = useMemo(() => {
    const needsReorder = rawItems.filter((i) => i.reorder_qty > 0);
    const totalReorderQty = needsReorder.reduce((s, i) => s + Number(i.reorder_qty), 0);
    const totalEstCost = needsReorder.reduce(
      (s, i) => s + Number(i.reorder_qty) * Number(i.last_unit_cost || i.cost_price || 0),
      0,
    );
    const weekendFocus = rawItems.filter(
      (i) => Number(i.weekend_avg_qty) > Number(i.weekday_avg_qty),
    );
    return { needsReorder: needsReorder.length, totalReorderQty, totalEstCost, weekendFocus: weekendFocus.length };
  }, [rawItems]);

  const getRowStatus = (item) => {
    const stock = Number(item.current_stock);
    const weekendDemand = Number(item.projected_weekend_demand);
    const weeklyDemand = Number(item.projected_weekly_demand);

    if (stock <= 0) return "critical";
    if (stock < weekendDemand) return "critical"; // can't cover the weekend
    if (stock < weeklyDemand) return "warning";
    return "ok";
  };

  const statusStyles = {
    critical: { row: "bg-red-500/5 border-l-2 border-l-red-500", badge: "bg-red-500/20 text-red-400", label: "Reorder Now" },
    warning:  { row: "bg-orange-500/5 border-l-2 border-l-orange-500", badge: "bg-orange-500/20 text-orange-400", label: "Low" },
    ok:       { row: "", badge: "bg-emerald-500/20 text-emerald-400", label: "OK" },
  };

  const handleCreatePO = () => {
    const reorderItems = items.filter((i) => i.reorder_qty > 0);
    if (reorderItems.length === 0) return;

    const initialLines = reorderItems.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.reorder_qty,
      unit_cost: Number(i.last_unit_cost || i.cost_price || 0),
    }));

    navigate("/inventory/receive", { state: { initialLines } });
  };

  if (isLoading) return <LoadingSpinner message="Calculating reorder forecast…" />;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-surface-400 shrink-0" />
          <div className="flex items-center gap-1 bg-surface-800 border border-surface-700 rounded-lg p-1">
            {LOOKBACK_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setLookbackDays(value)}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  lookbackDays === value
                    ? "bg-primary-500 text-white"
                    : "text-surface-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Filter pills */}
          <div className="flex items-center gap-1 bg-surface-800 border border-surface-700 rounded-lg p-1 overflow-x-auto scrollbar-hide">
            {FILTER_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === key
                    ? "bg-surface-600 text-white"
                    : "text-surface-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-lg px-3 py-1.5">
            <Search size={14} className="text-surface-500 shrink-0" />
            <input
              type="text"
              placeholder="Search product or supplier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none w-full sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <p className="text-xs text-surface-400 mb-1">Needs Reorder</p>
          <p className="text-2xl font-bold text-red-400">{summary.needsReorder}</p>
          <p className="text-[10px] text-surface-500">products</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
          <p className="text-xs text-surface-400 mb-1">Total Units</p>
          <p className="text-2xl font-bold text-orange-400">{Math.round(summary.totalReorderQty)}</p>
          <p className="text-[10px] text-surface-500">to order</p>
        </div>
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-3 text-center">
          <p className="text-xs text-surface-400 mb-1">Est. PO Cost</p>
          <p className="text-lg font-bold text-white">{fmt(summary.totalEstCost)}</p>
          <p className="text-[10px] text-surface-500">at last cost</p>
        </div>
        <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-3 text-center">
          <p className="text-xs text-surface-400 mb-1">Weekend Focus</p>
          <p className="text-2xl font-bold text-primary-400">{summary.weekendFocus}</p>
          <p className="text-[10px] text-surface-500">higher on weekends</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <TrendingUp size={14} className="text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-300">
          Forecast based on the last <strong>{lookbackDays} days</strong> of completed, paid sales.
          Reorder qty covers 1 week of demand at 120% plus buffer. Weekend demand uses Sat–Sun average
          separately from Mon–Fri to reflect the trading pattern.
        </p>
      </div>

      {/* Table / Cards */}
      {items.length === 0 ? (
        <div className="py-16 text-center">
          <CheckCircle size={28} className="mx-auto mb-2 text-emerald-500" />
          <p className="text-sm text-surface-400">
            {filter === "reorder"
              ? "All products are sufficiently stocked for the week."
              : "No products match this filter."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {items.map((item) => {
              const status = getRowStatus(item);
              const styles = statusStyles[status];
              const estCost =
                Number(item.reorder_qty) *
                Number(item.last_unit_cost || item.cost_price || 0);
              const isWeekendHeavy =
                Number(item.weekend_avg_qty) > Number(item.weekday_avg_qty);

              return (
                <div
                  key={item.product_id}
                  className={`border border-surface-700 rounded-xl p-3 space-y-2 ${styles.row}`}
                >
                  {/* Header: name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{item.product_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.category_name && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-surface-700 text-surface-400 rounded">
                            {item.category_name}
                          </span>
                        )}
                        {isWeekendHeavy && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-primary-500/20 text-primary-400 rounded">
                            Wknd ↑
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${styles.badge}`}>
                      {styles.label}
                    </span>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-surface-500">Stock</p>
                      <p className={`font-medium tabular-nums ${
                        Number(item.current_stock) <= 0 ? "text-red-400"
                        : Number(item.current_stock) < Number(item.projected_weekend_demand) ? "text-orange-400"
                        : "text-white"
                      }`}>
                        {fmtQty(item.current_stock, item.unit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-surface-500">Wk Demand</p>
                      <p className="text-surface-300 tabular-nums">{fmtQty(item.projected_weekly_demand, item.unit)}</p>
                    </div>
                    <div>
                      <p className="text-surface-500">Reorder</p>
                      <p className={`font-bold tabular-nums ${item.reorder_qty > 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {item.reorder_qty > 0 ? `+${item.reorder_qty}` : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Supplier + est cost footer */}
                  <div className="border-t border-surface-700/50 pt-2 flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="text-surface-400 truncate">
                        {item.last_supplier_name || <span className="text-surface-600">No supplier on record</span>}
                      </p>
                      {item.last_unit_cost > 0 && (
                        <p className="text-surface-600">Last: {fmt(item.last_unit_cost)}/{item.unit || "unit"}</p>
                      )}
                    </div>
                    {item.reorder_qty > 0 && item.last_unit_cost ? (
                      <span className="text-surface-300 tabular-nums shrink-0 ml-2">{fmt(estCost)}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-surface-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 bg-surface-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Product</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Stock</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Avg/Day</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    <span className="flex items-center justify-end gap-1">
                      <Clock size={11} />Week
                    </span>
                  </th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                    <span className="flex items-center justify-end gap-1 text-primary-400">
                      <AlertTriangle size={11} />Wknd
                    </span>
                  </th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Reorder Qty</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Est. Cost</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Preferred Supplier</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {items.map((item) => {
                  const status = getRowStatus(item);
                  const styles = statusStyles[status];
                  const estCost =
                    Number(item.reorder_qty) *
                    Number(item.last_unit_cost || item.cost_price || 0);
                  const isWeekendHeavy =
                    Number(item.weekend_avg_qty) > Number(item.weekday_avg_qty);

                  return (
                    <tr
                      key={item.product_id}
                      className={`hover:bg-surface-800/30 transition-colors ${styles.row}`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-white">{item.product_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {item.category_name && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-surface-700 text-surface-400 rounded">
                                {item.category_name}
                              </span>
                            )}
                            {isWeekendHeavy && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-primary-500/20 text-primary-400 rounded">
                                Weekend ↑
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`text-sm font-medium ${
                          Number(item.current_stock) <= 0 ? "text-red-400"
                          : Number(item.current_stock) < Number(item.projected_weekend_demand) ? "text-orange-400"
                          : "text-white"
                        }`}>
                          {fmtQty(item.current_stock, item.unit)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-surface-300 text-sm">
                        {fmtQty(item.avg_daily_qty, item.unit)}
                      </td>
                      <td className="px-3 py-3 text-right text-surface-300 text-sm">
                        {fmtQty(item.projected_weekly_demand, item.unit)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`text-sm font-medium ${isWeekendHeavy ? "text-primary-400" : "text-surface-400"}`}>
                          {fmtQty(item.projected_weekend_demand, item.unit)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`text-sm font-bold ${item.reorder_qty > 0 ? "text-red-400" : "text-emerald-400"}`}>
                          {item.reorder_qty > 0 ? `+${item.reorder_qty} ${item.unit || ""}` : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-surface-300">
                        {item.reorder_qty > 0 && item.last_unit_cost ? fmt(estCost) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        {item.last_supplier_name ? (
                          <div>
                            <p className="text-sm text-white">{item.last_supplier_name}</p>
                            {item.last_unit_cost > 0 && (
                              <p className="text-[10px] text-surface-500">
                                Last: {fmt(item.last_unit_cost)}/{item.unit || "unit"}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-surface-600">No receipt on record</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles.badge}`}>
                          {styles.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Footer action */}
      {summary.needsReorder > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-surface-700">
          <p className="text-xs text-surface-500 text-center sm:text-left">
            {summary.needsReorder} product{summary.needsReorder !== 1 ? "s" : ""} need restocking ·
            estimated {fmt(summary.totalEstCost)} at last purchase cost
          </p>
          <button
            onClick={handleCreatePO}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ShoppingCart size={15} />
            Create Purchase Order ({summary.needsReorder} items)
          </button>
        </div>
      )}
    </div>
  );
};

export default ReorderForecastTab;
