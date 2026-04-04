import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useReceiptDetail, useMarkReceiptPaid } from "@/hooks/useInventory";
import { fetchAccounts } from "@/services/accounts.service";
import toast from "react-hot-toast";
import { fmt, fmtDate } from "@/utils/formatters";
import { inputCls } from "@/utils/constants";

const daysOutstanding = (purchaseDate) => {
  if (!purchaseDate) return null;
  const diff = Date.now() - new Date(purchaseDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const PaymentBadge = ({ paidAt, purchaseDate, large = false }) => {
  if (paidAt) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${large ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"} rounded-full font-medium bg-green-500/20 text-green-400`}
      >
        <CheckCircle2 size={large ? 14 : 11} />
        Paid
      </span>
    );
  }
  const days = daysOutstanding(purchaseDate);
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${large ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"} rounded-full font-medium bg-yellow-500/20 text-yellow-400`}
    >
      <Clock size={large ? 14 : 11} />
      Pending{days != null ? ` · ${days}d` : ""}
    </span>
  );
};

const PAYMENT_METHODS = [
  { value: "bank", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "cheque", label: "Cheque" },
];

const ReceiptDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: receipt, isLoading, isError } = useReceiptDetail(id);
  const markPaid = useMarkReceiptPaid();
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({
    payment_method: "bank",
    bank_account_id: "",
    reference: "",
    notes: "",
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts({ active: true }),
    staleTime: 5 * 60 * 1000,
  });
  const leafBankAccounts = useMemo(() => {
    const all = accounts.filter((a) => a.account_class === "bank" && a.active);
    const leaves = all.filter((a) => a.parent_id !== null);
    return leaves.length > 0 ? leaves : all;
  }, [accounts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-surface-400">
        Loading…
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <p className="text-red-400 text-sm">Failed to load receipt.</p>
      </div>
    );
  }

  const items = receipt.inventory_receipt_items || [];
  const isPaid = !!receipt.paid_at;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
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
                <FileText size={18} className="text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white font-mono">
                  {receipt.invoice_number}
                </h2>
                <p className="text-xs text-surface-500 mt-0.5">
                  Invoice Number
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-surface-400">
              {receipt.supplier?.name && (
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} />
                  {receipt.supplier.name}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                {fmtDate(receipt.purchase_date)}
              </span>
              {receipt.notes && (
                <span className="text-surface-500 italic">
                  {receipt.notes}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <PaymentBadge
              paidAt={receipt.paid_at}
              purchaseDate={receipt.purchase_date}
              large
            />
            {isPaid && (
              <p className="text-xs text-surface-500">
                Paid {fmtDate(receipt.paid_at)}
              </p>
            )}
            {!isPaid && (
              <button
                onClick={() => setShowPayForm((v) => !v)}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {showPayForm ? "Cancel" : "Process Payment"}
              </button>
            )}
          </div>
        </div>

        {showPayForm && !isPaid && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!payForm.reference.trim()) {
                toast.error("Payment reference is required");
                return;
              }
              markPaid.mutate(
                { id, ...payForm },
                {
                  onSuccess: () => {
                    setShowPayForm(false);
                  },
                },
              );
            }}
            className="mt-4 pt-4 border-t border-surface-700 grid grid-cols-1 sm:grid-cols-4 gap-3"
          >
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Payment Method *</label>
              <select
                value={payForm.payment_method}
                onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value, bank_account_id: "" }))}
                className={inputCls}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            {payForm.payment_method === "bank" && (
              <div className="space-y-1">
                <label className="text-xs text-surface-400 font-medium">Bank Account *</label>
                <select
                  value={payForm.bank_account_id}
                  onChange={(e) => setPayForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                  className={inputCls}
                  required
                >
                  <option value="">Select bank account…</option>
                  {leafBankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Reference No. *</label>
              <input
                type="text"
                value={payForm.reference}
                onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
                placeholder="Cheque no, M-Pesa ref..."
                className={inputCls}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400 font-medium">Notes</label>
              <input
                type="text"
                value={payForm.notes}
                onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-4 flex items-center justify-between">
              <span className="text-sm text-surface-400">
                Amount: <span className="text-white font-bold">{fmt(receipt.total_amount)}</span>
              </span>
              <button
                type="submit"
                disabled={markPaid.isPending}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {markPaid.isPending ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Line items table */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-700">
          <h3 className="font-semibold text-white text-sm">Line Items</h3>
          <p className="text-xs text-surface-500 mt-0.5">
            {items.length} product{items.length !== 1 ? "s" : ""} received
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
                <th className="px-4 py-3 text-center hidden sm:table-cell">
                  Unit
                </th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit Cost</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-surface-700/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {item.products?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-surface-400 text-xs hidden sm:table-cell">
                    {item.products?.unit || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-surface-300">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-surface-300">
                    {fmt(item.unit_cost)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-primary-400">
                    {fmt(item.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-900">
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-3 text-right text-xs text-surface-400 uppercase tracking-wide font-semibold"
                >
                  Total
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-white">
                  {fmt(receipt.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReceiptDetailPage;
