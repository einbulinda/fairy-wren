import { useState } from "react";
import { useNavigate } from "react-router";
import {
  PackagePlus,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useAllReceipts } from "@/hooks/useInventory";

const PAGE_SIZE = 20;

const ApprovalBadge = ({ status }) => {
  const map = {
    approved: { cls: "bg-green-500/20 text-green-400", label: "Approved" },
    pending:  { cls: "bg-yellow-500/20 text-yellow-400", label: "Pending" },
    rejected: { cls: "bg-red-500/20 text-red-400", label: "Rejected" },
  };
  const { cls, label } = map[status] ?? { cls: "bg-surface-700 text-surface-400", label: status ?? "—" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
};

const PayBadge = ({ paid_at }) =>
  paid_at ? (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-500/20 text-primary-400">
      Paid
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-700/60 text-surface-500">
      Unpaid
    </span>
  );

const GoodsReceiptsTab = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const offset = (page - 1) * PAGE_SIZE;

  const { data: receipts = [], isLoading } = useAllReceipts({
    limit: PAGE_SIZE,
    offset,
  });

  const hasPrev = page > 1;
  const hasNext = receipts.length === PAGE_SIZE;

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20 text-surface-400">
        Loading…
      </div>
    );

  if (receipts.length === 0 && page === 1)
    return (
      <div className="bg-surface-800 rounded-xl border border-surface-700 px-6 py-14 text-center">
        <PackagePlus size={32} className="mx-auto mb-3 text-surface-600" />
        <p className="text-surface-400 text-sm">No goods receipts yet.</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {receipts.map((r) => (
          <div
            key={r.id}
            className="bg-surface-800/60 border border-surface-700 rounded-xl p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold text-sm truncate">
                  {r.invoice_number}
                </p>
                <p className="text-surface-400 text-xs mt-0.5">
                  {r.supplier?.name || "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-white font-mono font-bold text-sm">
                  KSh {Number(r.total_amount || 0).toLocaleString()}
                </p>
                <p className="text-surface-500 text-[10px] mt-0.5">
                  {new Date(r.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                    timeZone: "Africa/Nairobi",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ApprovalBadge status={r.approval_status} />
              <PayBadge paid_at={r.paid_at} />
              <span className="text-surface-500 text-[10px]">
                {r.item_count} item{Number(r.item_count) !== 1 ? "s" : ""}
              </span>
              {r.submitted_by?.name && (
                <span className="text-surface-500 text-[10px]">
                  · {r.submitted_by.name}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate(`/purchasing?tab=receipt-detail&id=${r.id}`)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white rounded-lg transition-colors"
            >
              <Eye size={12} /> View
            </button>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-900 text-surface-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Invoice</th>
              <th className="px-4 py-3 text-left">Supplier</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-center">Items</th>
              <th className="px-4 py-3 text-center">Approval</th>
              <th className="px-4 py-3 text-center">Payment</th>
              <th className="px-4 py-3 text-left">Submitted By</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {receipts.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-surface-700/30 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-white">
                  {r.invoice_number}
                </td>
                <td className="px-4 py-3 text-surface-300">
                  {r.supplier?.name || "—"}
                </td>
                <td className="px-4 py-3 text-surface-300 whitespace-nowrap">
                  {new Date(r.purchase_date || r.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                    timeZone: "Africa/Nairobi",
                  })}
                </td>
                <td className="px-4 py-3 text-right font-mono text-white">
                  KSh {Number(r.total_amount || 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center text-surface-300">
                  {r.item_count}
                </td>
                <td className="px-4 py-3 text-center">
                  <ApprovalBadge status={r.approval_status} />
                </td>
                <td className="px-4 py-3 text-center">
                  <PayBadge paid_at={r.paid_at} />
                </td>
                <td className="px-4 py-3 text-surface-400 text-xs">
                  {r.submitted_by?.name || "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => navigate(`/purchasing?tab=receipt-detail&id=${r.id}`)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white rounded-lg transition-colors"
                  >
                    <Eye size={12} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {(hasPrev || hasNext) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
            <p className="text-xs text-surface-400">
              Page {page}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev}
                className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
                className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile pagination */}
      {(hasPrev || hasNext) && (
        <div className="md:hidden flex items-center justify-between pt-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!hasPrev}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 rounded-lg transition-colors"
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <span className="text-xs text-surface-400">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300 rounded-lg transition-colors"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
};

export default GoodsReceiptsTab;
