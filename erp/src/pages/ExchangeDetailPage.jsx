import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { useExchangeDetail, useApproveExchange, useRejectExchange } from "@/hooks/useExchanges";
import { fmtDate } from "@/utils/formatters";

const ApprovalBadge = ({ status, large = false }) => {
  const sz = large ? 14 : 11;
  const cls = `inline-flex items-center gap-1.5 ${large ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"} rounded-full font-medium`;
  if (status === "pending")
    return <span className={`${cls} bg-yellow-500/20 text-yellow-400`}><Clock size={sz} /> Pending Approval</span>;
  if (status === "approved")
    return <span className={`${cls} bg-green-500/20 text-green-400`}><ShieldCheck size={sz} /> Approved</span>;
  if (status === "rejected")
    return <span className={`${cls} bg-red-500/20 text-red-400`}><ShieldX size={sz} /> Rejected</span>;
  return null;
};

const DirectionBadge = ({ direction, large = false }) => {
  const sz = large ? 14 : 11;
  const cls = `inline-flex items-center gap-1.5 ${large ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"} rounded-full font-medium`;
  return direction === "outbound" ? (
    <span className={`${cls} bg-orange-500/20 text-orange-400`}><ArrowUpRight size={sz} /> Outbound</span>
  ) : (
    <span className={`${cls} bg-blue-500/20 text-blue-400`}><ArrowDownLeft size={sz} /> Inbound</span>
  );
};

const ExchangeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: exchange, isLoading, isError } = useExchangeDetail(id);
  const approveMutation = useApproveExchange();
  const rejectMutation = useRejectExchange();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-surface-400">
        Loading…
      </div>
    );
  }

  if (isError || !exchange) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <p className="text-red-400 text-sm">Failed to load exchange.</p>
      </div>
    );
  }

  const items = exchange.product_exchange_items || [];
  const isPending = exchange.approval_status === "pending";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header card */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary-500/10">
                <Building2 size={18} className="text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {exchange.partner?.name || "—"}
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">Business Partner</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-surface-400">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                {fmtDate(exchange.exchange_date)}
              </span>
              {exchange.notes && (
                <span className="text-surface-500 italic">{exchange.notes}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap gap-2 justify-end">
              <DirectionBadge direction={exchange.direction} large />
              <ApprovalBadge status={exchange.approval_status} large />
            </div>
            {exchange.rejection_reason && (
              <p className="text-xs text-red-400 max-w-xs text-right">
                {exchange.rejection_reason}
              </p>
            )}

            {isPending && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRejectForm((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg text-sm font-medium transition-colors"
                >
                  <ShieldX size={14} />
                  {showRejectForm ? "Cancel" : "Reject"}
                </button>
                <button
                  onClick={() =>
                    approveMutation.mutate(id, {
                      onSuccess: () => navigate("/inventory/approvals"),
                    })
                  }
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <ShieldCheck size={14} />
                  {approveMutation.isPending ? "Approving…" : "Approve"}
                </button>
              </div>
            )}
          </div>
        </div>

        {showRejectForm && isPending && (
          <div className="mt-4 pt-4 border-t border-surface-700">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-1.5 bg-red-500/15 rounded-lg mt-0.5">
                <ShieldX size={14} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Reject Exchange</p>
                <p className="text-xs text-surface-400 mt-0.5">
                  No inventory will be updated.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-surface-400 font-medium">Reason for rejection (optional)</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Wrong partner, duplicate entry…"
                  className="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  disabled={rejectMutation.isPending}
                  onClick={() =>
                    rejectMutation.mutate(
                      { id, reason: rejectReason.trim() || "Rejected by approver" },
                      {
                        onSuccess: () => {
                          setShowRejectForm(false);
                          setRejectReason("");
                          navigate("/inventory/approvals");
                        },
                      },
                    )
                  }
                  className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <ShieldX size={14} />
                  {rejectMutation.isPending ? "Rejecting…" : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Line items table */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-700">
          <h3 className="font-semibold text-white text-sm">Products</h3>
          <p className="text-xs text-surface-500 mt-0.5">
            {items.length} product{items.length !== 1 ? "s" : ""}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-surface-400 text-sm">
            No line items found.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-900 text-surface-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">Unit</th>
                <th className="px-4 py-3 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-surface-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">
                    {item.products?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-surface-400 text-xs hidden sm:table-cell">
                    {item.products?.unit || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-surface-300">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ExchangeDetailPage;
