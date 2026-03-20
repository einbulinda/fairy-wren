import { useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useStockTakeDetail } from "@/hooks/useInventory";
import { PAGE_SIZE } from "./inventoryUtils";

const StatusBadge = ({ status }) => {
  const map = {
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
    under_review: "bg-blue-500/20 text-blue-400",
    pending: "bg-yellow-500/20 text-yellow-400",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${map[status] ?? "bg-surface-700 text-surface-400"}`}
    >
      {status?.replace("_", " ") || "pending"}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color = "primary" }) => (
  <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-surface-400 mb-1">{label}</p>
        <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
        {sub && <p className="text-xs text-surface-500 mt-0.5">{sub}</p>}
      </div>
      <div className={`p-2 rounded-lg bg-${color}-500/10`}>
        <Icon size={18} className={`text-${color}-400`} />
      </div>
    </div>
  </div>
);

const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col)
    return <ChevronUp size={12} className="opacity-30 ml-1 inline" />;
  return sortDir === "asc" ? (
    <ChevronUp size={12} className="ml-1 inline" />
  ) : (
    <ChevronDown size={12} className="ml-1 inline" />
  );
};

const COLS = [
  { key: "name", label: "Product", align: "left" },
  { key: "system_qty", label: "System Qty", align: "right" },
  { key: "physical_qty", label: "Physical Qty", align: "right" },
  { key: "variance", label: "Variance", align: "right" },
  { key: "variance_pct", label: "Variance %", align: "right" },
  { key: "value_impact", label: "Value Impact", align: "right" },
];

const ReportDetailView = ({ id }) => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const backTo =
    state?.from === "approvals"
      ? { path: "/inventory/approvals", label: "Back to Approvals" }
      : { path: "/inventory/reports", label: "Back to Reports" };

  const { data: report, isLoading, isError } = useStockTakeDetail(id);

  const [sortCol, setSortCol] = useState("variance_abs");
  const [sortDir, setSortDir] = useState("desc");
  const [itemPage, setItemPage] = useState(1);
  const [itemSearch, setItemSearch] = useState("");

  const items = useMemo(
    () => report?.stock_take_items || [],
    [report],
  );

  // Insights
  const total = items.length;
  const matched = items.filter((i) => (i.variance ?? 0) === 0).length;
  const shortages = items.filter((i) => (i.variance ?? 0) < 0);
  const surpluses = items.filter((i) => (i.variance ?? 0) > 0);
  const accuracy = total > 0 ? Math.round((matched / total) * 100) : 100;

  const totalValueImpact = items.reduce(
    (s, i) => s + (Number(i.total_value_adjustment) || 0),
    0,
  );
  const totalUnitsShort = shortages.reduce(
    (s, i) => s + Math.abs(i.variance ?? 0),
    0,
  );
  const totalUnitsOver = surpluses.reduce(
    (s, i) => s + (i.variance ?? 0),
    0,
  );

  const handleExportExcel = useCallback(() => {
    const reportDate = new Date(report.created_at).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const rows = items.map((item) => ({
      Product: item.products?.name || "—",
      "System Qty": item.system_qty ?? 0,
      "Physical Qty": item.physical_qty ?? 0,
      Variance: item.variance ?? 0,
      "Variance %": Number(item.variance_percentage ?? 0),
      "Value Impact (KSh)": Number(item.total_value_adjustment ?? 0),
      Reason: item.reason?.replace(/_/g, " ") || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws["!cols"] = [
      { wch: 30 }, // Product
      { wch: 12 }, // System Qty
      { wch: 12 }, // Physical Qty
      { wch: 10 }, // Variance
      { wch: 12 }, // Variance %
      { wch: 18 }, // Value Impact
      { wch: 20 }, // Reason
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Take Items");

    // Add a summary sheet
    const summaryRows = [
      { Field: "Report Name", Value: report.stock_take_name || "Stock Take" },
      { Field: "Date", Value: reportDate },
      { Field: "Performed By", Value: report.profiles?.name || "—" },
      { Field: "Location", Value: report.location || "—" },
      { Field: "Type", Value: report.stock_take_type || "full" },
      { Field: "Status", Value: report.approval_status || "pending" },
      { Field: "Items Counted", Value: total },
      { Field: "Stock Accuracy", Value: `${accuracy}%` },
      { Field: "Shortages", Value: `${shortages.length} items (${totalUnitsShort} units)` },
      { Field: "Surpluses", Value: `${surpluses.length} items (${totalUnitsOver} units)` },
      { Field: "Total Value Impact", Value: totalValueImpact },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    summaryWs["!cols"] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    const fileName = `stock-take-${(report.stock_take_name || "report").replace(/\s+/g, "-").toLowerCase()}-${new Date(report.created_at).toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [report, items, total, accuracy, shortages, surpluses, totalUnitsShort, totalUnitsOver, totalValueImpact]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir(col === "name" ? "asc" : "desc");
    }
    setItemPage(1);
  };

  const filteredItems = useMemo(() => {
    if (!itemSearch) return items;
    const term = itemSearch.toLowerCase();
    return items.filter(
      (i) =>
        (i.products?.name || "").toLowerCase().includes(term) ||
        (i.reason || "").replace(/_/g, " ").toLowerCase().includes(term),
    );
  }, [items, itemSearch]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let av, bv;
      switch (sortCol) {
        case "name":
          av = a.products?.name || "";
          bv = b.products?.name || "";
          break;
        case "system_qty":
          av = a.system_qty ?? 0;
          bv = b.system_qty ?? 0;
          break;
        case "physical_qty":
          av = a.physical_qty ?? 0;
          bv = b.physical_qty ?? 0;
          break;
        case "variance":
          av = a.variance ?? 0;
          bv = b.variance ?? 0;
          break;
        case "variance_pct":
          av = Number(a.variance_percentage ?? 0);
          bv = Number(b.variance_percentage ?? 0);
          break;
        case "value_impact":
          av = Number(a.total_value_adjustment ?? 0);
          bv = Number(b.total_value_adjustment ?? 0);
          break;
        default: // variance_abs
          av = Math.abs(a.variance ?? 0);
          bv = Math.abs(b.variance ?? 0);
          break;
      }
      if (typeof av === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [filteredItems, sortCol, sortDir]);

  const totalItemPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const safeItemPage = Math.min(itemPage, totalItemPages);
  const pageItems = sortedItems.slice(
    (safeItemPage - 1) * PAGE_SIZE,
    safeItemPage * PAGE_SIZE,
  );

  const fmt = (n) =>
    `KSh ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-surface-400">
        Loading…
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(backTo.path)}
          className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> {backTo.label}
        </button>
        <p className="text-red-400 text-sm">Failed to load report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(backTo.path)}
        className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> {backTo.label}
      </button>

      {/* Header */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {report.stock_take_name || "Stock Take"}
            </h2>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-surface-400">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(report.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {report.profiles?.name && (
                <span className="flex items-center gap-1.5">
                  <User size={14} />
                  {report.profiles.name}
                </span>
              )}
              {report.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} />
                  {report.location}
                </span>
              )}
              <span className="flex items-center gap-1.5 capitalize">
                <Package size={14} />
                {report.stock_take_type || "full"} count
              </span>
            </div>
            {report.approval_notes && (
              <p className="mt-2 text-xs text-surface-500 italic">
                Note: {report.approval_notes}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              disabled={items.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
            <StatusBadge status={report.approval_status} />
          </div>
        </div>
      </div>

      {/* Insight Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Package}
          label="Items Counted"
          value={total}
          color="primary"
        />
        <StatCard
          icon={CheckCircle}
          label="Stock Accuracy"
          value={`${accuracy}%`}
          sub={`${matched} of ${total} matched`}
          color="green"
        />
        <StatCard
          icon={TrendingDown}
          label="Shortages"
          value={shortages.length}
          sub={`${totalUnitsShort} units short`}
          color="red"
        />
        <StatCard
          icon={TrendingUp}
          label="Surpluses"
          value={surpluses.length}
          sub={`${totalUnitsOver} units over`}
          color="yellow"
        />
      </div>

      {/* Value Impact */}
      {totalValueImpact !== 0 && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm ${
            totalValueImpact < 0
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-green-500/10 border-green-500/30 text-green-300"
          }`}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            Total inventory value adjustment:{" "}
            <strong>{fmt(totalValueImpact)}</strong>
          </span>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white text-sm">Item Breakdown</h3>
            <p className="text-xs text-surface-500 mt-0.5">
              {itemSearch ? `${sortedItems.length} of ${total}` : total} items · click a column header to sort
            </p>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search products…"
              value={itemSearch}
              onChange={(e) => { setItemSearch(e.target.value); setItemPage(1); }}
              className="w-full sm:w-56 pl-8 pr-8 py-2 rounded-lg bg-surface-900 border border-surface-600 text-white placeholder-surface-500 text-sm focus:outline-none focus:border-primary-500 transition-colors"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-500" />
            {itemSearch && (
              <button
                onClick={() => setItemSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {sortedItems.length === 0 ? (
          <p className="px-5 py-8 text-center text-surface-400 text-sm">
            No items recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
                <tr>
                  {COLS.map(({ key, label, align }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className={`px-4 py-3 text-${align} cursor-pointer select-none hover:text-white transition-colors`}
                    >
                      {label}
                      <SortIcon col={key} sortCol={sortCol} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                {pageItems.map((item) => {
                  const v = item.variance ?? 0;
                  const vPct = Number(item.variance_percentage ?? 0);
                  const valImpact = Number(item.total_value_adjustment ?? 0);
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        v < 0
                          ? "hover:bg-red-500/5"
                          : v > 0
                            ? "hover:bg-yellow-500/5"
                            : "hover:bg-surface-700/30"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {item.products?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-surface-300">
                        {item.system_qty}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-surface-300">
                        {item.physical_qty}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-semibold ${
                          v < 0
                            ? "text-red-400"
                            : v > 0
                              ? "text-yellow-400"
                              : "text-green-400"
                        }`}
                      >
                        {v > 0 ? "+" : ""}
                        {v}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono text-xs ${
                          v < 0
                            ? "text-red-400"
                            : v > 0
                              ? "text-yellow-400"
                              : "text-surface-500"
                        }`}
                      >
                        {v === 0 ? "—" : `${vPct > 0 ? "+" : ""}${vPct.toFixed(1)}%`}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono text-xs ${
                          valImpact < 0
                            ? "text-red-400"
                            : valImpact > 0
                              ? "text-yellow-400"
                              : "text-surface-500"
                        }`}
                      >
                        {valImpact === 0 ? "—" : fmt(valImpact)}
                      </td>
                      <td className="px-4 py-3 text-surface-400 capitalize text-xs">
                        {item.reason?.replace(/_/g, " ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalItemPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
                <p className="text-xs text-surface-400">
                  Showing {(safeItemPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safeItemPage * PAGE_SIZE, sortedItems.length)} of{" "}
                  {sortedItems.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setItemPage((p) => Math.max(1, p - 1))}
                    disabled={safeItemPage === 1}
                    className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 text-xs text-surface-400">
                    {safeItemPage} / {totalItemPages}
                  </span>
                  <button
                    onClick={() =>
                      setItemPage((p) => Math.min(totalItemPages, p + 1))
                    }
                    disabled={safeItemPage === totalItemPages}
                    className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDetailView;
