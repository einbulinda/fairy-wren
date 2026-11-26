import { useState } from "react";
import { HandCoins, X } from "lucide-react";
import { usePayTips, useTipPayouts } from "@/hooks/useMpesa";
import { fmt, fmtDateTime } from "@/utils/formatters";
import { inputCls } from "@/utils/constants";

const ROLE_LABELS = { waitress: "Waiter", bartender: "Bartender", supervisor: "Supervisor", manager: "Manager" };

/**
 * Tips kept from M-Pesa overpayments, per staff member, and paying them out
 * (Dr 2200 Staff Tips Payable / Cr cash or bank).
 */
const MpesaTips = ({ summary }) => {
  const staff = summary?.tips?.staff ?? [];
  const accounts = summary?.payoutAccounts ?? [];
  const [paying, setPaying] = useState(null); // staff row
  const { data: payouts = [], isLoading: payoutsLoading } = useTipPayouts();

  return (
    <div className="space-y-4">
      <section className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-surface-700 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-white">Tips owed to staff</h2>
          <span className="text-amber-300 font-semibold tabular-nums">{fmt(summary?.tips?.owed ?? 0)}</span>
        </header>
        {staff.length === 0 ? (
          <p className="py-10 text-center text-surface-500 text-sm">No tips recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-900/50 border-b border-surface-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-400 uppercase tracking-wider">Staff</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Tips</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider hidden sm:table-cell">Paid out</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-surface-400 uppercase tracking-wider">Owed</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <p className="text-white">{s.name}{!s.active && <span className="ml-2 text-xs text-surface-500">(inactive)</span>}</p>
                      <p className="text-xs text-surface-500">{ROLE_LABELS[s.role] ?? s.role} · {s.tipCount} tip{s.tipCount === 1 ? "" : "s"}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-surface-200">{fmt(s.accrued)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-surface-400 hidden sm:table-cell">{fmt(s.paid)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${s.outstanding > 0 ? "text-amber-300" : "text-surface-500"}`}>
                      {fmt(s.outstanding)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setPaying(s)}
                        disabled={s.outstanding <= 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed text-emerald-400 text-xs rounded-lg"
                      >
                        <HandCoins size={13} /> Pay out
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-surface-700">
          <h2 className="font-semibold text-white">Payout history</h2>
        </header>
        {payoutsLoading ? (
          <p className="py-8 text-center text-surface-500 text-sm">Loading…</p>
        ) : payouts.length === 0 ? (
          <p className="py-8 text-center text-surface-500 text-sm">No payouts yet.</p>
        ) : (
          <ul className="divide-y divide-surface-700/50">
            {payouts.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="text-white">{p.recipientName}</p>
                  <p className="text-xs text-surface-500">
                    {fmtDateTime(p.paidAt)} · from {p.accountName} · by {p.paidBy}
                    {p.notes && ` · ${p.notes}`}
                  </p>
                </div>
                <span className="text-white font-medium tabular-nums shrink-0">{fmt(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {paying && <PayoutModal staff={paying} accounts={accounts} onClose={() => setPaying(null)} />}
    </div>
  );
};

const PayoutModal = ({ staff, accounts, onClose }) => {
  const pay = usePayTips();
  const [amount, setAmount] = useState(String(staff.outstanding));
  const [accountId, setAccountId] = useState(accounts.find((a) => a.code === "1010")?.id ?? accounts[0]?.id ?? "");
  const [notes, setNotes] = useState("");

  const value = Number(amount);
  const tooMuch = value > staff.outstanding + 0.001;
  const valid = value > 0 && !tooMuch && /^\d+(\.\d{1,2})?$/.test(amount) && accountId;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    pay.mutate(
      { recipientId: staff.id, amount: value, accountId, notes: notes.trim() || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-900 border border-surface-700 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h2 className="text-lg font-semibold text-white">Pay out tips to {staff.name}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-surface-400">
            Owed: <span className="text-amber-300 font-semibold">{fmt(staff.outstanding)}</span>
          </p>
          <label className="block">
            <span className="block text-sm font-medium text-surface-300 mb-1">Amount (KSh)</span>
            <input
              className={inputCls}
              inputMode="decimal"
              value={amount}
              onChange={(e) => /^\d*\.?\d{0,2}$/.test(e.target.value) && setAmount(e.target.value)}
              autoFocus
            />
            {tooMuch && <span className="text-xs text-red-400">More than {staff.name} is owed.</span>}
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-surface-300 mb-1">Pay from</span>
            <select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-surface-300 mb-1">Notes (optional)</span>
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder="e.g. Friday shift" />
          </label>
          <p className="text-xs text-surface-500">Posts Dr 2200 Staff Tips Payable / Cr the account above.</p>
        </div>
        <div className="px-5 py-4 border-t border-surface-700 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid || pay.isPending}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold"
          >
            {pay.isPending ? "Paying…" : `Pay ${valid ? fmt(value) : ""}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MpesaTips;
