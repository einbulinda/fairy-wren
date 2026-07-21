import { useState, useMemo, Fragment } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
} from "lucide-react";
import { useAllExchanges, useExchangeDetail } from "@/hooks/useExchanges";
import { PAGE_SIZE } from "./inventoryUtils";
import ExchangeFormModal from "./ExchangeFormModal";

const ApprovalBadge = ({ status }) => {
  const map = {
    approved: { cls: "bg-green-500/20 text-green-400", label: "Approved" },
    pending: { cls: "bg-yellow-500/20 text-yellow-400", label: "Pending" },
    rejected: { cls: "bg-red-500/20 text-red-400", label: "Rejected" },
  };
  const { cls, label } = map[status] ?? { cls: "bg-surface-700 text-surface-400", label: status ?? "—" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
};

const DirectionBadge = ({ direction }) =>
  direction === "outbound" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/20 text-orange-400">
      <ArrowUpRight size={10} /> Outbound
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-400">
      <ArrowDownLeft size={10} /> Inbound
    </span>
  );

/* Inline product breakdown, lazily fetched when a row is expanded */
const ExchangeItemsPanel = ({ id }) => {
  const { data: exchange, isLoading } = useExchangeDetail(id);
  const items = exchange?.product_exchange_items || [];

  if (isLoading) {
    return <p className="text-surface-400 text-xs py-3 text-center">Loading products…</p>;
  }
  if (items.length === 0) {
    return <p className="text-surface-500 text-xs py-3 text-center">No products found.</p>;
  }
  return (
    <div className="py-2">
      {exchange?.notes && (
        <p className="text-surface-400 text-xs italic px-1 pb-2">{exchange.notes}</p>
      )}
      <table className="w-full text-xs">
        <thead className="text-surface-500 uppercase">
          <tr>
            <th className="px-2 py-1.5 text-left">Product</th>
            <th className="px-2 py-1.5 text-left">Unit</th>
            <th className="px-2 py-1.5 text-right">Quantity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-700/60">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-2 py-1.5 text-white">{item.products?.name || "—"}</td>
              <td className="px-2 py-1.5 text-surface-400">{item.products?.unit || "—"}</td>
              <td className="px-2 py-1.5 text-right font-mono text-surface-300">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ExchangesTab = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [directionFilter, setDirectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const offset = (page - 1) * PAGE_SIZE;

  const params = useMemo(() => {
    const p = { limit: PAGE_SIZE, offset };
    if (directionFilter) p.direction = directionFilter;
    if (statusFilter) p.approval_status = statusFilter;
    return p;
  }, [offset, directionFilter, statusFilter]);

  const { data: exchanges = [], isLoading, refetch } = useAllExchanges(params);

  const hasPrev = page > 1;
  const hasNext = exchanges.length === PAGE_SIZE;

  const toggleExpanded = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={directionFilter}
            onChange={(e) => { setDirectionFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-300"
          >
            <option value="">All Directions</option>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-300"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm text-white font-medium transition-colors"
        >
          <Plus size={14} /> New Exchange
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-surface-400">Loading…</div>
      ) : exchanges.length === 0 && page === 1 ? (
        <div className="bg-surface-800 rounded-xl border border-surface-700 px-6 py-14 text-center">
          <ArrowLeftRight size={32} className="mx-auto mb-3 text-surface-600" />
          <p className="text-surface-400 text-sm">No product exchanges yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {exchanges.map((ex) => {
              const isExpanded = expandedId === ex.id;
              return (
                <div key={ex.id} className="bg-surface-800/60 border border-surface-700 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold text-sm truncate">{ex.partner?.name || "—"}</p>
                      <p className="text-surface-500 text-[10px] mt-0.5">
                        {new Date(ex.exchange_date || ex.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi",
                        })}
                      </p>
                    </div>
                    <DirectionBadge direction={ex.direction} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <ApprovalBadge status={ex.approval_status} />
                    <span className="text-surface-500 text-[10px]">
                      {ex.item_count} item{Number(ex.item_count) !== 1 ? "s" : ""}
                    </span>
                    {ex.submitted_by?.name && (
                      <span className="text-surface-500 text-[10px]">· {ex.submitted_by.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpanded(ex.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white rounded-lg transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {isExpanded ? "Hide Products" : "Products Loaned"}
                    </button>
                    <button
                      onClick={() => navigate(`/inventory/exchanges/${ex.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white rounded-lg transition-colors"
                    >
                      <Eye size={12} /> View
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-surface-700/60 -mx-3 px-3">
                      <ExchangeItemsPanel id={ex.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-900 text-surface-400 text-xs uppercase">
                <tr>
                  <th className="px-2 py-3 w-8" />
                  <th className="px-4 py-3 text-left">Partner</th>
                  <th className="px-4 py-3 text-left">Direction</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-center">Approval</th>
                  <th className="px-4 py-3 text-left">Submitted By</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                {exchanges.map((ex) => {
                  const isExpanded = expandedId === ex.id;
                  return (
                    <Fragment key={ex.id}>
                      <tr className="hover:bg-surface-700/30 transition-colors">
                        <td className="px-2 py-3 text-center">
                          <button
                            onClick={() => toggleExpanded(ex.id)}
                            className="p-1 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
                            title="Show products loaned"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-medium text-white">{ex.partner?.name || "—"}</td>
                        <td className="px-4 py-3"><DirectionBadge direction={ex.direction} /></td>
                        <td className="px-4 py-3 text-surface-300 whitespace-nowrap">
                          {new Date(ex.exchange_date || ex.created_at).toLocaleDateString("en-GB", {
                            day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi",
                          })}
                        </td>
                        <td className="px-4 py-3 text-center text-surface-300">{ex.item_count}</td>
                        <td className="px-4 py-3 text-center"><ApprovalBadge status={ex.approval_status} /></td>
                        <td className="px-4 py-3 text-surface-400 text-xs">{ex.submitted_by?.name || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => navigate(`/inventory/exchanges/${ex.id}`)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white rounded-lg transition-colors"
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-surface-900/40">
                          <td className="px-4 py-2" colSpan={8}>
                            <ExchangeItemsPanel id={ex.id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {(hasPrev || hasNext) && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
                <p className="text-xs text-surface-400">Page {page}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!hasPrev} className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={!hasNext} className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile pagination */}
          {(hasPrev || hasNext) && (
            <div className="md:hidden flex items-center justify-between pt-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!hasPrev} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 rounded-lg transition-colors">
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="text-xs text-surface-400">Page {page}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={!hasNext} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 rounded-lg transition-colors">
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <ExchangeFormModal onClose={() => setShowForm(false)} onSuccess={refetch} />
      )}
    </div>
  );
};

export default ExchangesTab;
