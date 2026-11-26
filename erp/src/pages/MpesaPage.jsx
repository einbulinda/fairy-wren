import { useState } from "react";
import { useSearchParams } from "react-router";
import toast from "react-hot-toast";
import { List, CircleAlert, HandCoins, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMpesaSummary } from "@/hooks/useMpesa";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { fmt, fmtDateTime } from "@/utils/formatters";
import MpesaRegister, { Stat } from "@/components/mpesa/MpesaRegister";
import MpesaOpenItems from "@/components/mpesa/MpesaOpenItems";
import MpesaTips from "@/components/mpesa/MpesaTips";

// Keep in sync with mpesaNavTabs (mobile bottom nav) in AppShell.jsx
const VIEWS = [
  { key: "payments", label: "Payments", icon: List },
  { key: "open", label: "Unmatched & deposits", icon: CircleAlert },
  { key: "tips", label: "Tips", icon: HandCoins },
];

/**
 * M-Pesa Payments (sidebar → Finance). Payments received through KCB:
 * period summary + searchable table, open items, and staff tips.
 * Matching itself happens on the POS; here managers check, reverse,
 * pay out tips and keep 2300 / 2200 explained.
 */
const MpesaPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = VIEWS.some((v) => v.key === searchParams.get("view")) ? searchParams.get("view") : "payments";
  const { data: summary, isLoading } = useMpesaSummary();

  const setView = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set("view", key);
    setSearchParams(next);
  };

  const c = summary?.clearing;
  const t = summary?.tips;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="lg:mr-auto">
          <h1 className="text-xl font-bold text-white">M-Pesa Payments</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            Payments received through KCB, what they were matched to, deposits and staff tips
          </p>
        </div>
        <RequireIpnSetting />
      </div>

      {/* Views (desktop; mobile uses the bottom nav) */}
      <div className="hidden lg:block border-b border-surface-700">
        <nav className="flex gap-1">
          {VIEWS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                view === key ? "border-primary-500 text-primary-400" : "border-transparent text-surface-400 hover:text-white"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Current position (all days) — on the open-items and tips views */}
      {view !== "payments" && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Unmatched"
          value={isLoading ? "…" : fmt(c?.unmatched.amount)}
          sub={c ? `${c.unmatched.count} payment${c.unmatched.count === 1 ? "" : "s"}${c.oldestOpenAt ? ` · oldest ${fmtDateTime(c.oldestOpenAt)}` : ""}` : null}
          tone={c?.unmatched.amount > 0 ? "text-amber-300" : "text-white"}
        />
        <Stat
          label="Deposits held"
          value={isLoading ? "…" : fmt(c?.deposits.amount)}
          sub={c ? `${c.deposits.count} customer${c.deposits.count === 1 ? "" : "s"}` : null}
          tone="text-sky-400"
        />
        <Stat
          label="Tips owed to staff"
          value={isLoading ? "…" : fmt(t?.owed)}
          sub={t ? `${t.staff.filter((s) => s.outstanding > 0).length} staff` : null}
          tone={t?.owed > 0 ? "text-amber-300" : "text-white"}
        />
        <LedgerCheck summary={summary} isLoading={isLoading} />
      </div>
      )}

      {view === "payments" && <MpesaRegister />}
      {view === "open" && <MpesaOpenItems />}
      {view === "tips" && <MpesaTips summary={summary} />}
    </div>
  );
};

/**
 * 2300 should equal unmatched + deposits (minus any receipt journal that failed
 * to post), and 2200 should equal tips owed. Anything else needs a look.
 */
const LedgerCheck = ({ summary, isLoading }) => {
  if (isLoading || !summary) return <Stat label="Ledger check" value="…" />;
  const { clearing: c, tips: t } = summary;
  const ok = Math.abs(c.difference) < 0.01 && Math.abs(t.difference) < 0.01;
  return (
    <div className={`border rounded-xl p-4 ${ok ? "bg-emerald-500/5 border-emerald-500/30" : "bg-red-500/5 border-red-500/40"}`}>
      <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">Ledger check</p>
      <p className={`text-lg font-bold flex items-center gap-1.5 ${ok ? "text-emerald-400" : "text-red-400"}`}>
        {ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        {ok ? "Balanced" : "Needs review"}
      </p>
      <p className="text-xs text-surface-500 mt-0.5">
        2300 {fmt(c.ledgerBalance)}{Math.abs(c.difference) >= 0.01 && <span className="text-red-400"> (off by {fmt(c.difference)})</span>}
        {" · "}2200 {fmt(t.ledgerBalance)}{Math.abs(t.difference) >= 0.01 && <span className="text-red-400"> (off by {fmt(t.difference)})</span>}
      </p>
      {c.unjournaled.count > 0 && (
        <p className="text-xs text-amber-300 mt-1">
          {c.unjournaled.count} payment{c.unjournaled.count === 1 ? "" : "s"} ({fmt(c.unjournaled.amount)}) not yet in the ledger. They post when matched.
        </p>
      )}
    </div>
  );
};

/** Owner-only switch: stop cashiers typing M-Pesa amounts; M-Pesa must be matched to a KCB notification. */
const RequireIpnSetting = () => {
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const [confirming, setConfirming] = useState(false);
  const on = settings?.mpesa_require_ipn === "true";
  const isOwner = user?.role === "owner";

  const save = (value) =>
    update.mutate(
      { mpesa_require_ipn: value ? "true" : "false" },
      {
        onSuccess: () => {
          setConfirming(false);
          toast.success(value ? "Typed M-Pesa amounts are now blocked on the POS" : "Typed M-Pesa amounts are allowed again");
        },
        onError: () => toast.error("Couldn't save the setting"),
      },
    );

  return (
    <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 lg:max-w-sm">
      <div className="flex items-start gap-3">
        <ShieldCheck size={18} className={on ? "text-emerald-400 mt-0.5" : "text-surface-500 mt-0.5"} />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Only accept matched M-Pesa</p>
          <p className="text-xs text-surface-400 mt-0.5">
            {on
              ? "On. The POS only accepts M-Pesa matched to a payment received from KCB."
              : "Off. Cashiers can still type an M-Pesa amount by hand (needs confirmation)."}
          </p>
        </div>
        {isOwner && !confirming && (
          <button
            role="switch"
            aria-checked={on}
            aria-label="Only accept matched M-Pesa"
            onClick={() => (on ? save(false) : setConfirming(true))}
            disabled={update.isPending}
            className={`relative w-11 h-6 rounded-full shrink-0 transition-colors disabled:opacity-50 ${on ? "bg-emerald-500" : "bg-surface-600"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? "left-5.5" : "left-0.5"}`} />
          </button>
        )}
      </div>
      {confirming && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-amber-300">
            Turn this on only once KCB notifications arrive reliably. If they stop, cashiers can't take M-Pesa until you turn it off.
          </p>
          <div className="flex gap-2">
            <button onClick={() => save(true)} disabled={update.isPending}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs rounded-lg">
              Turn on
            </button>
            <button onClick={() => setConfirming(false)} className="px-3 py-1.5 text-xs text-surface-400 hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}
      {!isOwner && <p className="text-[11px] text-surface-500 mt-2">Only the owner can change this.</p>}
    </div>
  );
};

export default MpesaPage;
