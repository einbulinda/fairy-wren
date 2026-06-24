import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  Info,
} from "lucide-react";
import { fetchAuditLogs, fetchAuditEntities } from "@/services/audit.service";
import { fmtDate } from "@/utils/formatters";
import { dateInputCls } from "@/utils/constants";
import { MobileCard, MobileCardList } from "@/components/shared/MobileCard";

const localDateStr = (d) => d.toISOString().slice(0, 10);
const today = localDateStr(new Date());

const ACTION_COLORS = {
  _CREATE: "bg-emerald-500/15 text-emerald-400",
  _CREATED: "bg-emerald-500/15 text-emerald-400",
  _UPDATE: "bg-blue-500/15 text-blue-400",
  _UPDATED: "bg-blue-500/15 text-blue-400",
  _DELETE: "bg-red-500/15 text-red-400",
  _DELETED: "bg-red-500/15 text-red-400",
  _VOID: "bg-red-500/15 text-red-400",
  _VOIDED: "bg-red-500/15 text-red-400",
  LOGIN: "bg-primary-500/15 text-primary-400",
  LOGOUT: "bg-surface-600/30 text-surface-400",
  _CHANGED: "bg-amber-500/15 text-amber-400",
  _CLOSED: "bg-orange-500/15 text-orange-400",
  _REOPENED: "bg-teal-500/15 text-teal-400",
};

const getActionColor = (action = "") => {
  for (const [suffix, cls] of Object.entries(ACTION_COLORS)) {
    if (action.endsWith(suffix) || action === suffix.replace("_", "")) return cls;
  }
  return "bg-surface-600/30 text-surface-400";
};

const fmtAction = (action = "") =>
  action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const fmtEntity = (entity = "") =>
  entity.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const MetadataView = ({ metadata }) => {
  const [open, setOpen] = useState(false);
  if (!metadata || Object.keys(metadata).length === 0) return <span className="text-surface-600">—</span>;
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-surface-400 hover:text-white transition-colors"
      >
        <Info size={12} />
        Details
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <pre className="mt-1 p-2 bg-surface-900 border border-surface-700 rounded text-[10px] text-surface-300 max-w-xs overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}
    </div>
  );
};

const AuditTrailPage = () => {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const params = useMemo(() => ({
    search: search || undefined,
    entity: entity || undefined,
    startDate,
    endDate,
    page,
    limit: 50,
  }), [search, entity, startDate, endDate, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => fetchAuditLogs(params),
    staleTime: 30 * 1000,
  });

  const { data: entities = [] } = useQuery({
    queryKey: ["audit-entities"],
    queryFn: fetchAuditEntities,
    staleTime: 10 * 60 * 1000,
  });

  const logs = data?.data ?? [];
  const pagination = data?.pagination ?? {};

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-600/20 rounded-lg">
            <Shield size={22} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Audit Trail</h1>
            <p className="text-sm text-surface-400">All system activity and changes</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              placeholder="Search actions, entities, users…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {search && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Entity filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-surface-500 shrink-0" />
            <select
              value={entity}
              onChange={(e) => { setEntity(e.target.value); setPage(1); }}
              className={`${dateInputCls} min-w-36`}
            >
              <option value="">All entities</option>
              {entities.map((e) => (
                <option key={e} value={e}>{fmtEntity(e)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider whitespace-nowrap">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className={dateInputCls}
            />
          </div>
          <span className="text-surface-600">→</span>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-surface-400 uppercase tracking-wider whitespace-nowrap">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className={dateInputCls}
            />
          </div>
          <span className="text-xs text-surface-500 ml-auto">
            {pagination.total !== undefined && `${pagination.total.toLocaleString()} records`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-surface-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <Shield size={36} className="mx-auto mb-3 text-surface-700" />
            <p className="text-surface-500">No audit records for this period</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 bg-surface-900/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Timestamp</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Entity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Performed By</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Reference</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/30">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-700/20 transition-colors">
                      <td className="px-4 py-3 text-surface-400 text-xs tabular-nums whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("en-KE", {
                          year: "numeric", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit", second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-surface-700/60 text-surface-300 text-xs rounded font-mono">
                          {log.entity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {fmtAction(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-surface-300 text-sm">
                        {log.performed_by_user?.name || <span className="text-surface-600 italic">system</span>}
                      </td>
                      <td className="px-4 py-3 text-surface-500 text-xs font-mono truncate max-w-[140px]" title={log.entity_id}>
                        {log.entity_id ? log.entity_id.slice(0, 8) + "…" : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <MetadataView metadata={log.metadata} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <MobileCardList>
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <MobileCard key={log.id} onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${getActionColor(log.action)}`}>
                        {fmtAction(log.action)}
                      </span>
                      <span className="text-[10px] text-surface-500 tabular-nums">
                        {new Date(log.created_at).toLocaleString("en-KE", {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs px-1.5 py-0.5 bg-surface-700/60 text-surface-300 rounded font-mono">
                        {log.entity}
                      </span>
                      <span className="text-xs text-surface-400">
                        {log.performed_by_user?.name || <span className="text-surface-600 italic">system</span>}
                      </span>
                    </div>
                    {isExpanded && log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre className="mt-2 pt-2 border-t border-surface-700/40 text-[10px] text-surface-300 whitespace-pre-wrap break-all">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </MobileCard>
                );
              })}
            </MobileCardList>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
                <span className="text-xs text-surface-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditTrailPage;
