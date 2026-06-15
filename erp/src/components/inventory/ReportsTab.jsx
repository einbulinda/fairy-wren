import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowRight,
  Search,
  X,
} from "lucide-react";
import { useStockTakeReports } from "@/hooks/useInventory";
import { PAGE_SIZE, inputCls } from "./inventoryUtils";

const StatusBadge = ({ status }) => {
  const map = {
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
    under_review: "bg-blue-500/20 text-blue-400",
    pending: "bg-yellow-500/20 text-yellow-400",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? "bg-surface-700 text-surface-400"}`}
    >
      {status?.replace("_", " ") || "pending"}
    </span>
  );
};

const STATUS_FILTERS = [
  { key: null, label: "All" },
  { key: "approved", label: "Approved" },
  { key: "pending", label: "Pending" },
  { key: "rejected", label: "Rejected" },
];

// "pending" filter matches both pending and under_review
const matchesStatus = (record, filterKey) => {
  if (!filterKey) return true;
  if (filterKey === "pending")
    return (
      record.approval_status === "pending" ||
      record.approval_status === "under_review"
    );
  return record.approval_status === filterKey;
};

const ReportsTab = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const p = {};
    if (startDate) p.startDate = startDate;
    if (endDate) p.endDate = endDate;
    return p;
  }, [startDate, endDate]);

  const { data: reports = [], isLoading } = useStockTakeReports(params);

  const filtered = useMemo(() => {
    let result = reports.filter((r) => matchesStatus(r, statusFilter));
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          (r.stock_take_name || "").toLowerCase().includes(term) ||
          (r.profiles?.name || "").toLowerCase().includes(term) ||
          (r.stock_take_type || "").toLowerCase().includes(term) ||
          (r.location || "").toLowerCase().includes(term),
      );
    }
    return result;
  }, [reports, statusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Count per status bucket for badges
  const counts = useMemo(
    () => ({
      null: reports.length,
      approved: reports.filter((r) => r.approval_status === "approved").length,
      pending: reports.filter(
        (r) =>
          r.approval_status === "pending" ||
          r.approval_status === "under_review",
      ).length,
      rejected: reports.filter((r) => r.approval_status === "rejected").length,
    }),
    [reports],
  );

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <div className="relative">
          <label className="block text-xs text-surface-400 mb-1">Search</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Name, performed by, type…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className={inputCls + " w-56 pl-8 pr-8"}
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-500" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs text-surface-400 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls + " w-40"}
          />
        </div>
        <div>
          <label className="block text-xs text-surface-400 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputCls + " w-40"}
          />
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-8 w-px bg-surface-700 self-center" />

        {/* Status filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="text-xs text-surface-400 hover:text-white transition-colors"
            >
              Clear dates
            </button>
          )}
          {STATUS_FILTERS.map(({ key, label }) => {
          const isActive = statusFilter === key;
          const count = counts[key];
          const colorMap = {
            approved: isActive
              ? "bg-green-600 text-white"
              : "bg-surface-800 border border-surface-700 text-surface-400 hover:border-green-500/50 hover:text-green-400",
            pending: isActive
              ? "bg-yellow-600 text-white"
              : "bg-surface-800 border border-surface-700 text-surface-400 hover:border-yellow-500/50 hover:text-yellow-400",
            rejected: isActive
              ? "bg-red-700 text-white"
              : "bg-surface-800 border border-surface-700 text-surface-400 hover:border-red-500/50 hover:text-red-400",
            null: isActive
              ? "bg-primary-600 text-white"
              : "bg-surface-800 border border-surface-700 text-surface-400 hover:border-primary-500/50 hover:text-white",
          };
          return (
            <button
              key={String(key)}
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${colorMap[key]}`}
            >
              {label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                  isActive ? "bg-white/20" : "bg-surface-700"
                }`}
              >
                {count}
              </span>
            </button>
          );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Stock Take Name</th>
              <th className="px-4 py-3 text-left">Date Performed</th>
              <th className="px-4 py-3 text-left">Performed By</th>
              <th className="px-4 py-3 text-center">Type</th>
              <th className="px-4 py-3 text-center">Products Counted</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-surface-400"
                >
                  Loading…
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-surface-400"
                >
                  No stock take reports found.
                </td>
              </tr>
            ) : (
              paginated.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/inventory/reports/${r.id}`)}
                  className="hover:bg-surface-700/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {r.stock_take_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-surface-300">
                    {new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}
                  </td>
                  <td className="px-4 py-3 text-surface-300">
                    {r.profiles?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-surface-400 capitalize">
                    {r.stock_take_type || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-surface-300">
                    {r.stock_take_items?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={r.approval_status} />
                  </td>
                  <td className="px-4 py-3 text-surface-500">
                    <ArrowRight size={14} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
            <p className="text-xs text-surface-400">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 text-xs text-surface-400">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsTab;
