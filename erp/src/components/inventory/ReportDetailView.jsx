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
} from "lucide-react";
import { useStockTakeDetail } from "@/hooks/useInventory";

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

const ReportDetailView = ({ id }) => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const backTo =
    state?.from === "approvals"
      ? { path: "/inventory/approvals", label: "Back to Approvals" }
      : { path: "/inventory/reports", label: "Back to Reports" };
  const { data: report, isLoading, isError } = useStockTakeDetail(id);

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

  const items = report.stock_take_items || [];

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

  // Sort: biggest variance (abs) first
  const sortedItems = [...items].sort(
    (a, b) => Math.abs(b.variance ?? 0) - Math.abs(a.variance ?? 0),
  );

  const fmt = (n) =>
    `KSh ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(backTo.path)}
        className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to Reports
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
          <StatusBadge status={report.approval_status} />
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
        <div className="px-5 py-4 border-b border-surface-700">
          <h3 className="font-semibold text-white text-sm">Item Breakdown</h3>
          <p className="text-xs text-surface-500 mt-0.5">
            Sorted by variance magnitude (largest first)
          </p>
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
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-right">System Qty</th>
                  <th className="px-4 py-3 text-right">Physical Qty</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-right">Variance %</th>
                  <th className="px-4 py-3 text-right">Value Impact</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                {sortedItems.map((item) => {
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDetailView;
