import { useState, useMemo, Fragment } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAllExchanges, useExchangeDetail } from "@/hooks/useExchangeReports";

const PAGE_SIZE = 8;

const StatusBadge = ({ status }) => {
  const map = {
    approved: "bg-green-500/20 text-green-400",
    pending: "bg-yellow-500/20 text-yellow-400",
    rejected: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? "bg-gray-700 text-gray-400"}`}>
      {status || "pending"}
    </span>
  );
};

const DirectionBadge = ({ direction }) =>
  direction === "outbound" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">
      <ArrowUpRight size={11} /> Outbound
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
      <ArrowDownLeft size={11} /> Inbound
    </span>
  );

const ExchangeItemsPanel = ({ id }) => {
  const { data: exchange, isLoading } = useExchangeDetail(id);
  const items = exchange?.product_exchange_items || [];

  if (isLoading) return <p className="text-gray-400 text-xs py-3 text-center">Loading products…</p>;
  if (items.length === 0) return <p className="text-gray-500 text-xs py-3 text-center">No products found.</p>;

  return (
    <div className="py-2">
      {exchange?.notes && <p className="text-gray-400 text-xs italic px-1 pb-2">{exchange.notes}</p>}
      <div className="divide-y divide-gray-700/60">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-1 py-1.5 text-sm">
            <span className="text-white">{item.products?.name || "—"}</span>
            <span className="text-gray-400 font-mono text-xs">
              {item.quantity} {item.products?.unit || ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ExchangeReportView() {
  const [page, setPage] = useState(1);
  const [directionFilter, setDirectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const offset = (page - 1) * PAGE_SIZE;

  const params = useMemo(() => {
    const p = { limit: PAGE_SIZE, offset };
    if (directionFilter) p.direction = directionFilter;
    if (statusFilter) p.approval_status = statusFilter;
    return p;
  }, [offset, directionFilter, statusFilter]);

  const { data: exchanges = [], isLoading } = useAllExchanges(params);

  const hasPrev = page > 1;
  const hasNext = exchanges.length === PAGE_SIZE;

  const toggleExpanded = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="max-w-2xl mx-auto pb-8 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={directionFilter}
          onChange={(e) => { setDirectionFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-yellow-400"
        >
          <option value="">All Directions</option>
          <option value="outbound">Outbound</option>
          <option value="inbound">Inbound</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-yellow-400"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : exchanges.length === 0 && page === 1 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl px-6 py-12 text-center text-gray-400 text-sm">
          No product exchanges yet.
        </div>
      ) : (
        <div className="space-y-2">
          {exchanges.map((ex) => {
            const isExpanded = expandedId === ex.id;
            return (
              <Fragment key={ex.id}>
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleExpanded(ex.id)}
                    className="w-full p-3 flex items-start justify-between gap-2 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold text-sm truncate">{ex.partner?.name || "—"}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <DirectionBadge direction={ex.direction} />
                        <StatusBadge status={ex.approval_status} />
                        <span className="text-gray-500 text-[11px]">
                          {ex.item_count} item{Number(ex.item_count) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-gray-500 text-[11px] mt-1">
                        {new Date(ex.exchange_date || ex.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi",
                        })}
                        {ex.submitted_by?.name ? ` · ${ex.submitted_by.name}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-gray-400 pt-1">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-700 px-3">
                      <ExchangeItemsPanel id={ex.id} />
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-between pt-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!hasPrev} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 rounded-lg transition-colors">
            <ChevronLeft size={13} /> Prev
          </button>
          <span className="text-xs text-gray-400">Page {page}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={!hasNext} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 rounded-lg transition-colors">
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
