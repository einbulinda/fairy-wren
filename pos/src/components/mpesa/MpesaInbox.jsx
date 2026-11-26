import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Smartphone, X, ArrowLeft, Search, RefreshCw, Gift, PiggyBank, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMpesaTransactions } from "@/hooks/useMpesaTransactions";
import { useAppStore } from "@/store/app.store";
import { MpesaService, mpesaErrorMessage } from "@/services/mpesa.service";
import { canAllocateMpesa, canManageMpesa, round2, timeAgo } from "@/utils/mpesa";
import { localDateStr } from "@/utils/formatters";
import StaffCombobox from "./StaffCombobox";

const ksh = (n) => `KSh ${Number(n || 0).toLocaleString()}`;

/* ======================================================
   HEADER BUTTON (+ badge)
   ====================================================== */

/**
 * Header button showing how many received M-Pesa payments are not yet matched.
 * Renders nothing for users who can't match M-Pesa payments.
 */
const MpesaInboxButton = ({ className = "" }) => {
  const { user } = useAuth();
  const allowed = canAllocateMpesa(user);
  const [open, setOpen] = useState(false);
  const { items } = useMpesaTransactions({ enabled: allowed });

  if (!allowed) return null;
  const count = items.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`relative p-2 rounded-lg transition-colors ${className}`}
        title="M-Pesa payments"
        aria-label={`M-Pesa payments, ${count} unmatched`}
      >
        <Smartphone size={18} className="text-green-400" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-green-500 text-[11px] font-bold text-white flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {/* Portal: the POS headers use backdrop-blur, which makes them the containing
          block for position:fixed children — rendered inside the header, the
          full-screen dialog was squeezed into the header strip (appeared blank). */}
      {open && createPortal(<MpesaInboxModal onClose={() => setOpen(false)} />, document.body)}
    </>
  );
};

/* ======================================================
   MODAL
   ====================================================== */

const MpesaInboxModal = ({ onClose }) => {
  const { user } = useAuth();
  const isManager = canManageMpesa(user);
  const [tab, setTab] = useState("open"); // open | matched
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  // Escape: back from a payment's detail, otherwise close.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (selectedId) setSelectedId(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, onClose]);

  const { items, loading, error, reload } = useMpesaTransactions({
    status: tab === "open" ? "open" : "all",
    from: tab === "open" ? undefined : localDateStr(),
    q: debouncedQ || undefined,
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-60">
      <div className="bg-gray-900 border-2 border-green-500/30 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl h-[90vh] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-green-500/20 shrink-0">
          {selectedId && (
            <button onClick={() => setSelectedId(null)} className="p-2 hover:bg-gray-800 rounded-lg" aria-label="Back">
              <ArrowLeft size={20} />
            </button>
          )}
          <h3 className="text-xl font-bold text-green-400 flex items-center gap-2 flex-1">
            <Smartphone size={20} /> M-Pesa payments
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg" aria-label="Close">
            <X size={22} className="text-gray-400" />
          </button>
        </div>

        {selectedId ? (
          <MpesaDetail
            id={selectedId}
            isManager={isManager}
            onDone={() => {
              setSelectedId(null);
              reload();
            }}
          />
        ) : (
          <>
            <div className="p-4 space-y-3 border-b border-gray-800 shrink-0">
              <div className="flex gap-2">
                {[
                  ["open", "Unmatched"],
                  ["matched", "Today (all)"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      tab === key ? "bg-green-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <div className="flex-1" />
                <button onClick={reload} className="p-2 hover:bg-gray-800 rounded-lg" aria-label="Refresh">
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, receipt, phone, deposit…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {error && <p className="text-sm text-red-400">{mpesaErrorMessage(error)}</p>}
              {!error && !loading && items.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  {tab === "open" ? "All M-Pesa payments are matched." : "No M-Pesa payments today."}
                </p>
              )}
              {items.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className="w-full text-left rounded-xl border border-gray-700 hover:border-green-500/60 bg-gray-800/50 px-4 py-3"
                >
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold truncate">
                      {t.payerName || "Unknown payer"}
                      <span className="ml-2 text-xs font-normal text-gray-400">{t.phone}</span>
                    </span>
                    <span className="font-mono font-bold text-green-300 shrink-0">{ksh(t.remaining)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-xs text-gray-400">
                    <span>{t.receipt}</span>
                    <span>· {timeAgo(t.transactionAt)}</span>
                    {t.remaining !== t.amount && <span>· paid {ksh(t.amount)}</span>}
                    <StatusChip status={t.status} />
                    {t.depositLabel && t.remaining > 0 && (
                      <span className="px-1.5 rounded bg-blue-500/20 text-blue-300">Deposit: {t.depositLabel}</span>
                    )}
                    {t.billReference && <span>· ref “{t.billReference}”</span>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const StatusChip = ({ status }) => {
  const map = {
    unallocated: ["Unmatched", "bg-yellow-500/20 text-yellow-300"],
    partially_allocated: ["Part matched", "bg-orange-500/20 text-orange-300"],
    allocated: ["Matched", "bg-green-500/20 text-green-300"],
  };
  const [label, cls] = map[status] || [status, "bg-gray-700 text-gray-300"];
  return <span className={`px-1.5 rounded ${cls}`}>{label}</span>;
};

/* ======================================================
   DETAIL: match to bills, tip / deposit, reverse
   ====================================================== */

const MpesaDetail = ({ id, isManager, onDone }) => {
  const triggerBillsReload = useAppStore((s) => s.triggerBillsReload);
  const [txn, setTxn] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amounts, setAmounts] = useState({}); // billId -> string amount (selected bills only)
  const [rest, setRest] = useState(null); // null | "deposit" | "tip"
  const [depositLabel, setDepositLabel] = useState("");
  const [tipRecipient, setTipRecipient] = useState(null); // { id, name }
  const [showAllBills, setShowAllBills] = useState(false);
  const [billSearch, setBillSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await MpesaService.get(id);
      setTxn(t);
      setDepositLabel(t.depositLabel || t.payerName || "");
      setBills(t.remaining > 0 ? await MpesaService.suggestions(id) : []);
    } catch (err) {
      toast.error(mpesaErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const billTotal = useMemo(
    () => round2(Object.values(amounts).reduce((s, v) => s + (parseFloat(v) || 0), 0)),
    [amounts],
  );
  const left = txn ? round2(txn.remaining - billTotal) : 0;

  if (loading && !txn) return <p className="p-6 text-gray-400">Loading…</p>;
  if (!txn) return null;

  const toggleBill = (b) => {
    setAmounts((prev) => {
      if (b.billId in prev) {
        const next = { ...prev };
        delete next[b.billId];
        return next;
      }
      const used = Object.values(prev).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      const fill = round2(Math.max(0, Math.min(b.payable, txn.remaining - used)));
      return { ...prev, [b.billId]: fill > 0 ? String(fill) : "" };
    });
  };

  const billLines = Object.entries(amounts)
    .map(([billId, v]) => ({ type: "bill", billId, amount: round2(parseFloat(v) || 0) }))
    .filter((l) => l.amount > 0);

  const overBill = billLines.find((l) => {
    const b = bills.find((x) => x.billId === l.billId);
    return b && l.amount > b.payable + 0.001;
  });

  const valid =
    !overBill &&
    left >= -0.001 &&
    (billLines.length > 0 || (rest && left > 0)) &&
    !(rest === "deposit" && !depositLabel.trim()) &&
    !(rest === "tip" && left > 0 && !tipRecipient);

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const lines = [...billLines];
      if (rest === "tip" && left > 0) {
        lines.push({
          type: "tip",
          billId: billLines[0]?.billId ?? null,
          recipientId: tipRecipient.id,
          amount: left,
        });
      }
      const res = await MpesaService.allocate(id, {
        lines,
        ...(rest === "deposit" && left > 0 && { depositLabel: depositLabel.trim() }),
      });
      const completed = (res.bills || []).filter((b) => b.status === "completed").length;
      toast.success(
        `Matched ${ksh(res.allocated)}${completed ? ` · ${completed} bill${completed > 1 ? "s" : ""} paid` : ""}` +
          (res.remaining > 0 ? ` · ${ksh(res.remaining)} left` : ""),
      );
      triggerBillsReload();
      onDone();
    } catch (err) {
      toast.error(mpesaErrorMessage(err), { duration: 6000 });
      load();
    } finally {
      setSaving(false);
    }
  };

  // Customer-name search over the open bills (already loaded, so it filters instantly).
  const term = billSearch.trim().toLowerCase();
  const matching = term ? bills.filter((b) => (b.customerName || "").toLowerCase().includes(term)) : bills;
  // Bills already ticked stay on screen even when the search would hide them.
  const tickedHidden = bills.filter((b) => b.billId in amounts && !matching.includes(b));
  const listed = term || showAllBills ? matching : matching.slice(0, 8);
  const visibleBills = [...tickedHidden, ...listed];

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Payment summary */}
        <div className="rounded-xl bg-gray-800/60 p-4 space-y-1">
          <div className="flex justify-between gap-3">
            <span className="font-semibold">{txn.payerName || "Unknown payer"}</span>
            <span className="font-mono font-bold text-green-300">{ksh(txn.amount)}</span>
          </div>
          <p className="text-xs text-gray-400">
            {txn.phone} · {txn.receipt} · {new Date(txn.transactionAt).toLocaleString()}
          </p>
          {txn.billReference && <p className="text-xs text-gray-400">Customer reference: “{txn.billReference}”</p>}
          {txn.depositLabel && txn.remaining > 0 && (
            <p className="text-xs text-blue-300">Deposit for: {txn.depositLabel}</p>
          )}
          <p className="text-sm pt-1">
            Left to match: <span className="font-mono font-bold text-white">{ksh(txn.remaining)}</span>
          </p>
        </div>

        {/* Bills */}
        {txn.remaining > 0 && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="text-sm font-medium text-gray-300 sm:mr-auto">Apply to bills</p>
              {bills.length > 0 && (
                <div className="relative sm:w-64">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="search"
                    value={billSearch}
                    onChange={(e) => setBillSearch(e.target.value)}
                    placeholder="Search customer name…"
                    aria-label="Search bills by customer name"
                    className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm focus:outline-none focus:border-green-500"
                  />
                  {billSearch && (
                    <button
                      onClick={() => setBillSearch("")}
                      aria-label="Clear bill search"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
            {bills.length === 0 && <p className="text-sm text-gray-500">No open bills with a balance.</p>}
            {term && (
              <p className="text-xs text-gray-500">
                {matching.length
                  ? `${matching.length} bill${matching.length === 1 ? "" : "s"} match “${billSearch.trim()}”`
                  : `No open bill for “${billSearch.trim()}”`}
                {tickedHidden.length > 0 && ` · ${tickedHidden.length} ticked bill${tickedHidden.length === 1 ? "" : "s"} kept at the top`}
              </p>
            )}
            {visibleBills.map((b) => {
              const selected = b.billId in amounts;
              const over = selected && (parseFloat(amounts[b.billId]) || 0) > b.payable + 0.001;
              return (
                <div
                  key={b.billId}
                  className={`rounded-lg border px-3 py-2 ${
                    selected ? "border-green-500 bg-green-500/10" : "border-gray-700 bg-gray-800/40"
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleBill(b)}
                      className="w-5 h-5 accent-green-500 shrink-0"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{b.customerName}</span>
                      <span className="block text-xs text-gray-400">
                        {b.createdBy} · balance {ksh(b.payable)}
                        {b.pendingAmount > 0 && ` · ${ksh(b.pendingAmount)} pending`}
                      </span>
                      {b.match?.reasons?.length > 0 && (
                        <span className="text-[11px] text-green-300">{b.match.reasons.join(", ")}</span>
                      )}
                    </span>
                  </label>
                  {selected && (
                    <div className="mt-2 flex items-center gap-2 pl-8">
                      <span className="text-xs text-gray-400">KSh</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amounts[b.billId]}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setAmounts((p) => ({ ...p, [b.billId]: v }));
                        }}
                        className={`w-32 px-2 py-1 rounded bg-gray-900 border font-mono ${
                          over ? "border-red-500" : "border-gray-600"
                        } focus:outline-none focus:border-green-500`}
                      />
                      {over && <span className="text-xs text-red-400">max {ksh(b.payable)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
            {!term && bills.length > 8 && (
              <button onClick={() => setShowAllBills((s) => !s)} className="text-xs text-green-400 hover:underline">
                {showAllBills ? "Show fewer" : `Show all ${bills.length} open bills`}
              </button>
            )}
          </div>
        )}

        {/* What to do with the rest */}
        {txn.remaining > 0 && left > 0.001 && (
          <div className="space-y-2">
            <p className="text-sm text-yellow-300">
              {ksh(left)} {billLines.length ? "left over" : "to keep"}. Keep it as:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRest(rest === "deposit" ? null : "deposit")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-sm font-semibold ${
                  rest === "deposit" ? "border-blue-400 bg-blue-400/10 text-blue-300" : "border-gray-600 text-gray-300"
                }`}
              >
                <PiggyBank size={16} /> Deposit for later
              </button>
              <button
                onClick={() => setRest(rest === "tip" ? null : "tip")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-sm font-semibold ${
                  rest === "tip" ? "border-yellow-400 bg-yellow-400/10 text-yellow-300" : "border-gray-600 text-gray-300"
                }`}
              >
                <Gift size={16} /> Tip
              </button>
            </div>
            {rest === "tip" && (
              <StaffCombobox
                value={tipRecipient}
                onChange={setTipRecipient}
                placeholder="Who is the tip for? Type a name…"
                disabled={saving}
                autoFocus
              />
            )}
            {rest === "deposit" && (
              <input
                value={depositLabel}
                onChange={(e) => setDepositLabel(e.target.value)}
                maxLength={120}
                placeholder="Whose deposit? e.g. Peter, table 4"
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-blue-500/40 text-sm focus:outline-none focus:border-blue-400"
              />
            )}
            {!rest && billLines.length > 0 && (
              <p className="text-xs text-gray-500">Or leave it unmatched and come back later.</p>
            )}
          </div>
        )}
        {left < -0.001 && <p className="text-sm text-red-400">Bills add up to more than this payment.</p>}

        {/* History + reversal */}
        {txn.allocations?.length > 0 && (
          <AllocationHistory allocations={txn.allocations} isManager={isManager} onReversed={() => { triggerBillsReload(); load(); }} />
        )}
      </div>

      {txn.remaining > 0 && (
        <div className="p-4 border-t border-gray-800 shrink-0">
          <button
            onClick={submit}
            disabled={!valid || saving}
            className="w-full py-3.5 rounded-lg bg-green-600 hover:bg-green-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : billLines.length ? `Match ${ksh(billTotal)} to ${billLines.length} bill${billLines.length > 1 ? "s" : ""}` : "Save"}
          </button>
        </div>
      )}
    </>
  );
};

const AllocationHistory = ({ allocations, isManager, onReversed }) => {
  const [reversingId, setReversingId] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const reverse = async (allocationId) => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await MpesaService.reverse(allocationId, reason.trim());
      toast.success("Match reversed. The money is back on this M-Pesa payment.");
      setReversingId(null);
      setReason("");
      onReversed();
    } catch (err) {
      toast.error(mpesaErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-300">Already matched</p>
      {allocations.map((a) => (
        <div key={a.id} className={`rounded-lg border border-gray-700 px-3 py-2 text-sm ${a.reversedAt ? "opacity-50" : ""}`}>
          <div className="flex justify-between gap-2">
            <span>
              {a.type === "tip" ? `Tip for ${a.tipRecipientName || "staff"}` : a.customerName}
              {a.type === "tip" && a.customerName && <span className="text-gray-400"> ({a.customerName})</span>}
            </span>
            <span className="font-mono">{ksh(a.amount)}</span>
          </div>
          <p className="text-xs text-gray-400">
            {a.allocatedBy} · {timeAgo(a.allocatedAt)}
            {a.reversedAt && ` · reversed by ${a.reversedBy}: ${a.reversalReason}`}
          </p>
          {isManager && !a.reversedAt && (
            reversingId === a.id ? (
              <div className="mt-2 flex gap-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason, e.g. wrong table"
                  className="flex-1 min-w-0 px-2 py-1 rounded bg-gray-900 border border-gray-600 text-sm focus:outline-none focus:border-red-400"
                />
                <button
                  onClick={() => reverse(a.id)}
                  disabled={busy || !reason.trim()}
                  className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm disabled:opacity-40"
                >
                  Reverse
                </button>
                <button onClick={() => setReversingId(null)} className="px-2 py-1 text-sm text-gray-400">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setReversingId(a.id); setReason(""); }}
                className="mt-1 text-xs text-red-400 hover:underline flex items-center gap-1"
              >
                <Undo2 size={12} /> Reverse match
              </button>
            )
          )}
        </div>
      ))}
    </div>
  );
};

export default MpesaInboxButton;
