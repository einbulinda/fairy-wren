import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Receipt,
  Building2,
  Calendar,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldX,
  ChevronRight,
} from "lucide-react";
import { useMyReceipts, useReceiptDetail } from "@/hooks/inventory/useInventoryReports";
import { formatCurrency } from "@/utils/common";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })
    : "—";

const daysOutstanding = (purchaseDate) => {
  if (!purchaseDate) return null;
  const diff = Date.now() - new Date(purchaseDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const PaymentBadge = ({ paidAt, status, purchaseDate }) => {
  const cls = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium";
  if (status === "cancelled") {
    return <span className={`${cls} bg-red-500/20 text-red-400`}><XCircle size={11} /> Cancelled</span>;
  }
  if (paidAt) {
    return <span className={`${cls} bg-green-500/20 text-green-400`}><CheckCircle2 size={11} /> Paid</span>;
  }
  const days = daysOutstanding(purchaseDate);
  return (
    <span className={`${cls} bg-yellow-500/20 text-yellow-400`}>
      <Clock size={11} /> Pending{days != null ? ` · ${days}d` : ""}
    </span>
  );
};

const ApprovalBadge = ({ status }) => {
  const cls = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium";
  if (status === "pending")
    return <span className={`${cls} bg-yellow-500/20 text-yellow-400`}><Clock size={11} /> Pending Approval</span>;
  if (status === "approved")
    return <span className={`${cls} bg-green-500/20 text-green-400`}><ShieldCheck size={11} /> Approved</span>;
  if (status === "rejected")
    return <span className={`${cls} bg-red-500/20 text-red-400`}><ShieldX size={11} /> Rejected</span>;
  return null;
};

const STATUS_FILTERS = [
  { key: null, label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

/* ─── list ────────────────────────────────────────────────────────────── */

const ReceiptsList = ({ onSelect }) => {
  const { data: receipts = [], isLoading } = useMyReceipts();
  const [statusFilter, setStatusFilter] = useState(null);

  const counts = useMemo(() => ({
    null: receipts.length,
    pending: receipts.filter((r) => r.approval_status === "pending").length,
    approved: receipts.filter((r) => r.approval_status === "approved").length,
    rejected: receipts.filter((r) => r.approval_status === "rejected").length,
  }), [receipts]);

  const filtered = statusFilter
    ? receipts.filter((r) => r.approval_status === statusFilter)
    : receipts;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <Receipt size={20} className="text-yellow-400" /> My Receipts
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Goods receipts you've submitted</p>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ key, label }) => {
          const isActive = statusFilter === key;
          return (
            <button
              key={String(key)}
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-yellow-500 text-gray-900"
                  : "bg-gray-800 border border-gray-700 text-gray-400 hover:border-yellow-500/50 hover:text-white"
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${isActive ? "bg-black/20" : "bg-gray-700"}`}>
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Receipt size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="text-sm">No receipts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="w-full text-left bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-2.5 hover:border-gray-600 active:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white font-mono font-semibold truncate">{r.invoice_number}</p>
                  {r.supplier?.name && (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                      <Building2 size={12} /> {r.supplier.name}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="text-gray-500 shrink-0 mt-1" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <ApprovalBadge status={r.approval_status} />
                <PaymentBadge paidAt={r.paid_at} status={r.status} purchaseDate={r.purchase_date} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-700/50">
                <span className="flex items-center gap-1.5">
                  <Calendar size={11} /> {fmtDate(r.purchase_date)}
                  <span className="mx-1">·</span>
                  {r.item_count} item{Number(r.item_count) !== 1 ? "s" : ""}
                </span>
                <span className="font-mono font-semibold text-yellow-400">{formatCurrency(r.total_amount)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── detail ──────────────────────────────────────────────────────────── */

const ReceiptDetail = ({ id, onBack }) => {
  const { data: receipt, isLoading, isError } = useReceiptDetail(id);

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>;
  }

  if (isError || !receipt) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <p className="text-red-400 text-sm">Failed to load receipt.</p>
      </div>
    );
  }

  const items = receipt.inventory_receipt_items || [];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to My Receipts
      </button>

      {/* Header */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white font-mono font-bold text-lg truncate">{receipt.invoice_number}</p>
            <p className="text-xs text-gray-500">Invoice Number</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ApprovalBadge status={receipt.approval_status} />
          <PaymentBadge paidAt={receipt.paid_at} status={receipt.status} purchaseDate={receipt.purchase_date} />
        </div>
        {receipt.rejection_reason && (
          <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
            Rejection reason: {receipt.rejection_reason}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-700 text-sm">
          {receipt.supplier?.name && (
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={11} /> Supplier</p>
              <p className="text-white mt-0.5">{receipt.supplier.name}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={11} /> Date</p>
            <p className="text-white mt-0.5">{fmtDate(receipt.purchase_date)}</p>
          </div>
        </div>
        {receipt.notes && <p className="text-xs text-gray-400 italic">{receipt.notes}</p>}
      </div>

      {/* Line items */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <Package size={14} className="text-yellow-400" /> Items ({items.length})
          </span>
        </div>
        {items.length === 0 ? (
          <p className="text-center py-8 text-gray-500 text-sm">No line items found.</p>
        ) : (
          <div className="divide-y divide-gray-700/60">
            {items.map((item) => (
              <div key={item.id} className="p-3 space-y-1.5">
                <p className="text-white text-sm font-medium">{item.products?.name || "—"}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{item.quantity} {item.products?.unit || ""} × {formatCurrency(item.unit_cost)}</span>
                  <span className="font-mono font-semibold text-yellow-400">{formatCurrency(item.line_total)}</span>
                </div>
              </div>
            ))}
            <div className="px-4 py-3 flex items-center justify-between font-semibold text-sm bg-gray-900/50">
              <span className="text-gray-400">Total</span>
              <span className="font-mono text-white">{formatCurrency(receipt.total_amount)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── root view ───────────────────────────────────────────────────────── */

export default function MyReceiptsView() {
  const [selectedId, setSelectedId] = useState(null);

  if (selectedId) {
    return <ReceiptDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return <ReceiptsList onSelect={setSelectedId} />;
}
