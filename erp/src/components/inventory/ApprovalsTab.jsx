import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  CheckCircle,
  XCircle,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  PackagePlus,
  ArrowLeftRight,
} from "lucide-react";
import {
  useStockTakeReports,
  useApproveStockTake,
  useRejectStockTake,
  usePendingReceipts,
  useApproveReceipt,
  useRejectReceipt,
} from "@/hooks/useInventory";
import {
  usePendingExchanges,
  useApproveExchange,
  useRejectExchange,
} from "@/hooks/useExchanges";
import { PAGE_SIZE } from "./inventoryUtils";

const StatusBadge = ({ status }) => {
  const map = {
    under_review: "bg-blue-500/20 text-blue-400",
    pending: "bg-yellow-500/20 text-yellow-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? "bg-surface-700 text-surface-400"}`}>
      {status?.replace("_", " ") || "pending"}
    </span>
  );
};

const SortIcon = ({ col, sortCol, sortDir }) => {
  if (sortCol !== col) return <ChevronUp size={12} className="opacity-30" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="text-primary-400" />
    : <ChevronDown size={12} className="text-primary-400" />;
};

/* ── Stock-take approvals section ── */
const StockTakeApprovals = () => {
  const navigate = useNavigate();
  const { data: all = [], isLoading, refetch } = useStockTakeReports();
  const approveMutation = useApproveStockTake();
  const rejectMutation = useRejectStockTake();

  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);

  const pending = useMemo(
    () => (all || []).filter((r) => r.approval_status === "under_review"),
    [all],
  );

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sorted = useMemo(() => {
    return [...pending].sort((a, b) => {
      let av, bv;
      if (sortCol === "name") {
        av = (a.stock_take_name || "").toLowerCase();
        bv = (b.stock_take_name || "").toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (sortCol === "performed_by") {
        av = (a.profiles?.name || "").toLowerCase();
        bv = (b.profiles?.name || "").toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (sortCol === "created_at") {
        av = new Date(a.created_at).getTime();
        bv = new Date(b.created_at).getTime();
      } else if (sortCol === "items") {
        av = a.stock_take_items?.length ?? 0;
        bv = b.stock_take_items?.length ?? 0;
      } else return 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [pending, sortCol, sortDir]);

  useEffect(() => setPage(1), [sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const thCls = "px-4 py-3 text-left cursor-pointer select-none hover:text-white transition-colors";

  if (isLoading)
    return <div className="flex items-center justify-center py-20 text-surface-400">Loading…</div>;

  if (sorted.length === 0)
    return (
      <div className="bg-surface-800 rounded-xl border border-surface-700 px-6 py-12 text-center text-surface-400 text-sm">
        No stock takes pending approval.
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {paginated.map((session) => (
          <div key={session.id} className="bg-surface-800/60 border border-surface-700 rounded-xl p-3 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-white font-medium text-sm leading-tight flex-1 min-w-0 truncate">{session.stock_take_name || "—"}</p>
              <StatusBadge status={session.approval_status} />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-surface-500">
              <span>{new Date(session.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}</span>
              <span className="text-surface-700">·</span>
              <span>{session.profiles?.name || "—"}</span>
              <span className="text-surface-700">·</span>
              <span>{session.stock_take_items?.length ?? 0} items</span>
            </div>
            <div className="flex items-center gap-1.5 border-t border-surface-700/50 pt-2">
              <button
                onClick={() => navigate(`/inventory/reports/${session.id}`, { state: { from: "approvals" } })}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white rounded-lg transition-colors"
              >
                <Eye size={12} /> View
              </button>
              <button
                onClick={() => approveMutation.mutate(session.id, { onSuccess: refetch })}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle size={12} /> Approve
              </button>
              <button
                onClick={() => rejectMutation.mutate(session.id, { onSuccess: refetch })}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors disabled:opacity-50"
              >
                <XCircle size={12} /> Reject
              </button>
            </div>
          </div>
        ))}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-surface-400 tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-surface-400 tabular-nums px-1">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
            <tr>
              <th className={thCls} onClick={() => handleSort("name")}>
                <span className="flex items-center gap-1">Stock Take Name <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} /></span>
              </th>
              <th className={thCls} onClick={() => handleSort("created_at")}>
                <span className="flex items-center gap-1">Date Submitted <SortIcon col="created_at" sortCol={sortCol} sortDir={sortDir} /></span>
              </th>
              <th className={thCls} onClick={() => handleSort("performed_by")}>
                <span className="flex items-center gap-1">Performed By <SortIcon col="performed_by" sortCol={sortCol} sortDir={sortDir} /></span>
              </th>
              <th className={thCls + " text-center"} onClick={() => handleSort("items")}>
                <span className="flex items-center justify-center gap-1">Items <SortIcon col="items" sortCol={sortCol} sortDir={sortDir} /></span>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {paginated.map((session) => (
              <tr key={session.id} className="hover:bg-surface-700/30 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{session.stock_take_name || "—"}</td>
                <td className="px-4 py-3 text-surface-300">
                  {new Date(session.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}
                </td>
                <td className="px-4 py-3 text-surface-300">{session.profiles?.name || "—"}</td>
                <td className="px-4 py-3 text-center text-surface-300">{session.stock_take_items?.length ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => navigate(`/inventory/reports/${session.id}`, { state: { from: "approvals" } })}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white rounded-lg transition-colors"
                    >
                      <Eye size={12} /> View
                    </button>
                    <button
                      onClick={() => approveMutation.mutate(session.id, { onSuccess: refetch })}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate(session.id, { onSuccess: refetch })}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
            <p className="text-xs text-surface-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 text-xs text-surface-400">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Pending goods receipts section ── */
const ReceiptApprovals = () => {
  const { data: receipts = [], isLoading } = usePendingReceipts();
  const approveMutation = useApproveReceipt();
  const rejectMutation = useRejectReceipt();
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleReject = (id) => {
    rejectMutation.mutate(
      { id, reason: rejectReason || "Rejected by approver" },
      { onSuccess: () => { setRejectingId(null); setRejectReason(""); } },
    );
  };

  if (isLoading)
    return <div className="flex items-center justify-center py-20 text-surface-400">Loading…</div>;

  if (receipts.length === 0)
    return (
      <div className="bg-surface-800 rounded-xl border border-surface-700 px-6 py-12 text-center text-surface-400 text-sm">
        No goods receipts pending approval.
      </div>
    );

  return (
    <div className="space-y-3">
      {/* Reject reason modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-semibold">Reject Receipt</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm placeholder-surface-500 resize-none focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                className="flex-1 py-2 rounded-lg text-sm bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectingId)}
                disabled={rejectMutation.isPending}
                className="flex-1 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                {rejectMutation.isPending ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {receipts.map((receipt) => (
        <div key={receipt.id} className="bg-surface-800/60 border border-surface-700 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-sm truncate">{receipt.invoice_number}</p>
              <p className="text-surface-400 text-xs mt-0.5">{receipt.supplier?.name || "Unknown supplier"}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-white font-mono font-bold text-sm">
                KSh {Number(receipt.total_amount || 0).toLocaleString()}
              </p>
              <p className="text-surface-500 text-[10px] mt-0.5">
                {new Date(receipt.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-surface-400">
            <span>{receipt.submitted_by?.name || "—"}</span>
            <span className="text-surface-700">·</span>
            <span>{receipt.item_count} item{Number(receipt.item_count) !== 1 ? "s" : ""}</span>
            <span className="text-surface-700">·</span>
            <span className="text-yellow-400 font-medium">Pending</span>
          </div>
          <div className="flex gap-2 pt-1 border-t border-surface-700/50">
            <button
              onClick={() => approveMutation.mutate(receipt.id)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle size={13} /> Approve
            </button>
            <button
              onClick={() => setRejectingId(receipt.id)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors disabled:opacity-50"
            >
              <XCircle size={13} /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Pending exchanges section ── */
const ExchangeApprovals = () => {
  const { data: exchanges = [], isLoading } = usePendingExchanges();
  const approveMutation = useApproveExchange();
  const rejectMutation = useRejectExchange();
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleReject = (id) => {
    rejectMutation.mutate(
      { id, reason: rejectReason || "Rejected by approver" },
      { onSuccess: () => { setRejectingId(null); setRejectReason(""); } },
    );
  };

  if (isLoading)
    return <div className="flex items-center justify-center py-20 text-surface-400">Loading…</div>;

  if (exchanges.length === 0)
    return (
      <div className="bg-surface-800 rounded-xl border border-surface-700 px-6 py-12 text-center text-surface-400 text-sm">
        No product exchanges pending approval.
      </div>
    );

  return (
    <div className="space-y-3">
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-semibold">Reject Exchange</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white text-sm placeholder-surface-500 resize-none focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                className="flex-1 py-2 rounded-lg text-sm bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectingId)}
                disabled={rejectMutation.isPending}
                className="flex-1 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
              >
                {rejectMutation.isPending ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {exchanges.map((exchange) => (
        <div key={exchange.id} className="bg-surface-800/60 border border-surface-700 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-sm truncate">{exchange.partner?.name || "Unknown partner"}</p>
              <p className="text-surface-400 text-xs mt-0.5 capitalize">{exchange.direction}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-surface-500 text-[10px] mt-0.5">
                {new Date(exchange.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-surface-400">
            <span>{exchange.submitted_by?.name || "—"}</span>
            <span className="text-surface-700">·</span>
            <span>{exchange.item_count} item{Number(exchange.item_count) !== 1 ? "s" : ""}</span>
            <span className="text-surface-700">·</span>
            <span className="text-yellow-400 font-medium">Pending</span>
          </div>
          <div className="flex gap-2 pt-1 border-t border-surface-700/50">
            <button
              onClick={() => approveMutation.mutate(exchange.id)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle size={13} /> Approve
            </button>
            <button
              onClick={() => setRejectingId(exchange.id)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors disabled:opacity-50"
            >
              <XCircle size={13} /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Main ApprovalsTab with sub-nav ── */
const ApprovalsTab = () => {
  const [section, setSection] = useState("stock-take");
  const { data: pendingReceipts = [] } = usePendingReceipts();
  const { data: pendingExchanges = [] } = usePendingExchanges();

  return (
    <div className="space-y-4">
      {/* Sub-nav */}
      <div className="flex gap-1 bg-surface-800/50 p-1 rounded-xl border border-surface-700 w-fit">
        <button
          onClick={() => setSection("stock-take")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            section === "stock-take"
              ? "bg-primary-600 text-white"
              : "text-surface-400 hover:text-white"
          }`}
        >
          <ClipboardCheck size={14} /> Stock Takes
        </button>
        <button
          onClick={() => setSection("receipts")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            section === "receipts"
              ? "bg-primary-600 text-white"
              : "text-surface-400 hover:text-white"
          }`}
        >
          <PackagePlus size={14} /> Goods Receipts
          {pendingReceipts.length > 0 && (
            <span className="ml-1 bg-yellow-500 text-black text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
              {pendingReceipts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setSection("exchanges")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            section === "exchanges"
              ? "bg-primary-600 text-white"
              : "text-surface-400 hover:text-white"
          }`}
        >
          <ArrowLeftRight size={14} /> Exchanges
          {pendingExchanges.length > 0 && (
            <span className="ml-1 bg-yellow-500 text-black text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
              {pendingExchanges.length}
            </span>
          )}
        </button>
      </div>

      {section === "stock-take" ? (
        <StockTakeApprovals />
      ) : section === "receipts" ? (
        <ReceiptApprovals />
      ) : (
        <ExchangeApprovals />
      )}
    </div>
  );
};

export default ApprovalsTab;
