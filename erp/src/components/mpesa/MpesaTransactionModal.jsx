import { useState } from "react";
import { X, Loader2, Undo2 } from "lucide-react";
import { useMpesaTransaction, useReverseMpesaAllocation } from "@/hooks/useMpesa";
import { fmt, fmtDateTime } from "@/utils/formatters";
import { inputCls } from "@/utils/constants";

/**
 * One M-Pesa payment: details, what it was matched to, and reversal of a
 * wrong match (with a reason). Reversing returns the money to the payment so
 * it can be matched again from the POS.
 */
const MpesaTransactionModal = ({ id, onClose }) => {
  const { data: txn, isLoading } = useMpesaTransaction(id);
  const reverse = useReverseMpesaAllocation();
  const [reversingId, setReversingId] = useState(null);
  const [reason, setReason] = useState("");

  const submitReverse = (allocationId) => {
    if (!reason.trim()) return;
    reverse.mutate(
      { allocationId, reason: reason.trim() },
      { onSuccess: () => { setReversingId(null); setReason(""); } },
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-surface-900 border border-surface-700 w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h2 className="text-lg font-semibold text-white">M-Pesa payment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {isLoading || !txn ? (
          <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-surface-400" /></div>
        ) : (
          <div className="overflow-y-auto p-5 space-y-5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="Payer">{txn.payerName || "—"}</Field>
              <Field label="Phone">{txn.phone || "—"}</Field>
              <Field label="Receipt"><span className="font-mono">{txn.receipt}</span></Field>
              <Field label="Received">{fmtDateTime(txn.transactionAt)}</Field>
              <Field label="Amount"><span className="font-semibold">{fmt(txn.amount)}</span></Field>
              <Field label="Left to match">
                <span className={txn.remaining > 0 ? "text-amber-300 font-semibold" : "text-emerald-400"}>{fmt(txn.remaining)}</span>
              </Field>
              {txn.billReference && <Field label="Customer reference">“{txn.billReference}”</Field>}
              {txn.depositLabel && txn.remaining > 0 && <Field label="Deposit for">{txn.depositLabel}</Field>}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Matched to</h3>
              {txn.allocations.length === 0 ? (
                <p className="text-sm text-surface-500">Not matched yet. Match it from the POS M-Pesa inbox.</p>
              ) : (
                <ul className="space-y-2">
                  {txn.allocations.map((a) => (
                    <li key={a.id} className={`rounded-lg border border-surface-700 px-3 py-2.5 ${a.reversedAt ? "opacity-50" : ""}`}>
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-white">
                          {a.type === "tip" ? `Tip for ${a.tipRecipientName || "staff"}` : `Bill: ${a.customerName}${a.invoiceNumber ? ` · ${a.invoiceNumber}` : ""}`}
                          {a.type === "tip" && a.customerName && <span className="text-surface-500"> ({a.customerName})</span>}
                        </span>
                        <span className="font-medium text-white tabular-nums">{fmt(a.amount)}</span>
                      </div>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {a.allocatedBy} · {fmtDateTime(a.allocatedAt)}
                        {a.reversedAt && ` · reversed by ${a.reversedBy} (${a.reversalReason})`}
                      </p>
                      {!a.reversedAt && (reversingId === a.id ? (
                        <div className="mt-2 flex flex-col sm:flex-row gap-2">
                          <input
                            className={inputCls}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason, e.g. matched to the wrong table"
                            autoFocus
                          />
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => submitReverse(a.id)}
                              disabled={!reason.trim() || reverse.isPending}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm rounded-lg"
                            >
                              {reverse.isPending ? "Reversing…" : "Reverse"}
                            </button>
                            <button onClick={() => setReversingId(null)} className="px-3 py-2 text-sm text-surface-400 hover:text-white">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setReversingId(a.id); setReason(""); }}
                          className="mt-1.5 text-xs text-red-400 hover:text-red-300 inline-flex items-center gap-1"
                        >
                          <Undo2 size={12} /> Reverse match
                        </button>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">{label}</p>
    <p className="text-surface-200 mt-0.5">{children}</p>
  </div>
);

export default MpesaTransactionModal;
