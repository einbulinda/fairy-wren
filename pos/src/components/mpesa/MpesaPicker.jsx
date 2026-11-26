import { useMemo, useState } from "react";
import { Smartphone, RefreshCw, Gift, PiggyBank, Check } from "lucide-react";
import { useMpesaTransactions } from "@/hooks/useMpesaTransactions";
import { buildIpnLine, round2, timeAgo } from "@/utils/mpesa";
import StaffCombobox from "./StaffCombobox";

const VISIBLE = 5;

/**
 * Pick a received KCB M-Pesa payment to pay (part of) a bill.
 * Used inside both payment modals. Best matches for the bill come first.
 *
 * @param {object}   props
 * @param {string}   props.billId
 * @param {string}   props.customerName  default deposit label
 * @param {number}   props.amountToCover what the bill still needs after lines already added
 * @param {string[]} props.excludeIds    notifications already used in this modal
 * @param {(line: object) => void} props.onAdd  receives a line from buildIpnLine()
 * @param {boolean}  props.disabled
 */
const MpesaPicker = ({ billId, customerName, amountToCover, excludeIds = [], onAdd, disabled }) => {
  const { items, loading, error, reload } = useMpesaTransactions({ billId });
  const [selectedId, setSelectedId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [overflowType, setOverflowType] = useState(null); // "tip" | "deposit"
  const [depositLabel, setDepositLabel] = useState(customerName || "");
  const [tipRecipient, setTipRecipient] = useState(null); // { id, name }

  const available = useMemo(
    () => items.filter((t) => t.remaining > 0 && !excludeIds.includes(t.id)),
    [items, excludeIds],
  );
  const visible = showAll ? available : available.slice(0, VISIBLE);
  const selected = available.find((t) => t.id === selectedId) || null;

  const applied = selected ? round2(Math.min(selected.remaining, amountToCover)) : 0;
  const extra = selected ? round2(selected.remaining - applied) : 0;
  const needsChoice = extra > 0;
  const canAdd =
    selected &&
    applied > 0 &&
    (!needsChoice || overflowType) &&
    !(needsChoice && overflowType === "tip" && !tipRecipient);

  const select = (id) => {
    setSelectedId(id === selectedId ? null : id);
    setOverflowType(null);
    setTipRecipient(null);
  };

  const handleAdd = () => {
    if (!canAdd) return;
    let choice = null;
    if (needsChoice && overflowType === "deposit") choice = { type: "deposit", label: depositLabel };
    if (needsChoice && overflowType === "tip") {
      choice = { type: "tip", recipientId: tipRecipient.id, recipientName: tipRecipient.name };
    }
    onAdd(buildIpnLine(selected, amountToCover, choice));
    setSelectedId(null);
    setOverflowType(null);
    setTipRecipient(null);
  };

  return (
    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
          <Smartphone size={16} /> Received M-Pesa payments
        </p>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="p-1 rounded hover:bg-green-500/10 text-green-400 disabled:opacity-50"
          aria-label="Refresh M-Pesa payments"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && <p className="text-xs text-red-400">Couldn't load M-Pesa payments.</p>}

      {!error && available.length === 0 && (
        <p className="text-xs text-gray-400">
          {loading
            ? "Loading…"
            : "No unmatched M-Pesa payments. They appear here seconds after the customer pays."}
        </p>
      )}

      <ul className="space-y-1.5">
        {visible.map((t) => {
          const isSelected = t.id === selectedId;
          const best = t.match?.reasons?.includes("exact amount") || t.match?.score >= 40;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => select(t.id)}
                disabled={disabled}
                className={`w-full text-left rounded-lg border px-3 py-2 transition-colors disabled:opacity-50 ${
                  isSelected
                    ? "border-green-500 bg-green-500/15"
                    : "border-gray-600/50 hover:border-green-500/50 bg-gray-800/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white truncate">
                    {t.payerName || "Unknown payer"}
                    <span className="ml-2 text-xs text-gray-400">{t.phone}</span>
                  </span>
                  <span className="font-mono font-bold text-green-300 shrink-0">
                    KSh {t.remaining.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-0.5 text-[11px] text-gray-400">
                  <span>{t.receipt}</span>
                  <span>· {timeAgo(t.transactionAt)}</span>
                  {t.remaining < t.amount && <span>· of KSh {t.amount.toLocaleString()}</span>}
                  {t.depositLabel && (
                    <span className="px-1.5 rounded bg-blue-500/20 text-blue-300">Deposit: {t.depositLabel}</span>
                  )}
                  {t.billReference && <span>· ref “{t.billReference}”</span>}
                  {best && (
                    <span className="px-1.5 rounded bg-green-500/20 text-green-300">
                      {t.match.reasons.join(", ")}
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {available.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="text-xs text-green-400 hover:underline"
        >
          {showAll ? "Show fewer" : `Show all ${available.length}`}
        </button>
      )}

      {selected && (
        <div className="space-y-2 border-t border-green-500/20 pt-2">
          <p className="text-sm text-gray-300">
            Apply <span className="font-mono font-bold text-white">KSh {applied.toLocaleString()}</span> to this bill
          </p>

          {needsChoice && (
            <div className="space-y-2">
              <p className="text-sm text-yellow-300">
                Customer paid <span className="font-mono font-bold">KSh {extra.toLocaleString()}</span> extra. Keep it as:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOverflowType("tip")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-sm font-semibold ${
                    overflowType === "tip"
                      ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                      : "border-gray-600 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <Gift size={16} /> Tip
                </button>
                <button
                  type="button"
                  onClick={() => setOverflowType("deposit")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-sm font-semibold ${
                    overflowType === "deposit"
                      ? "border-blue-400 bg-blue-400/10 text-blue-300"
                      : "border-gray-600 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <PiggyBank size={16} /> Deposit
                </button>
              </div>
              {overflowType === "tip" && (
                <StaffCombobox
                  value={tipRecipient}
                  onChange={setTipRecipient}
                  placeholder="Who is the tip for? Type a name…"
                  disabled={disabled}
                  autoFocus
                />
              )}
              {overflowType === "deposit" && (
                <input
                  type="text"
                  value={depositLabel}
                  onChange={(e) => setDepositLabel(e.target.value)}
                  placeholder="Whose deposit? e.g. Peter, table 4"
                  maxLength={120}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-blue-500/40 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-400"
                />
              )}
              {overflowType === "deposit" && (
                <p className="text-[11px] text-gray-400">
                  The extra stays on this M-Pesa payment for a later bill.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd || disabled}
            className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={16} /> Use this payment
          </button>
        </div>
      )}
    </div>
  );
};

export default MpesaPicker;
