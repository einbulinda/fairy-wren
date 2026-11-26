import { useState } from "react";
import { Smartphone, PiggyBank, CircleAlert } from "lucide-react";
import { useMpesaOpen } from "@/hooks/useMpesa";
import { fmt, fmtDateTime } from "@/utils/formatters";
import MpesaTransactionModal from "./MpesaTransactionModal";

const ageLabel = (date) => {
  const hrs = (Date.now() - new Date(date).getTime()) / 36e5;
  if (hrs < 1) return { text: `${Math.max(1, Math.round(hrs * 60))} min`, old: false };
  if (hrs < 24) return { text: `${Math.round(hrs)} h`, old: hrs >= 12 };
  return { text: `${Math.round(hrs / 24)} d`, old: true };
};

/**
 * Everything still sitting in 2300: payments nobody has matched yet, and
 * deposits kept for a later bill. Matching happens in the POS; here managers
 * see what's outstanding, how old it is, and can open each to check/reverse.
 */
const MpesaOpenItems = () => {
  const { data: items = [], isLoading, isError } = useMpesaOpen();
  const [openId, setOpenId] = useState(null);

  const unmatched = items.filter((t) => !t.depositLabel);
  const deposits = items.filter((t) => t.depositLabel);

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (isError) return <p className="py-16 text-center text-red-400 text-sm">Couldn't load open M-Pesa items.</p>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Group
        title="Unmatched payments"
        hint="Received but not yet matched to a bill. Ask the POS team to match these from the M-Pesa inbox."
        icon={CircleAlert}
        tone="text-amber-300"
        items={unmatched}
        empty="Every received payment has been matched."
        onOpen={setOpenId}
      />
      <Group
        title="Deposits for later bills"
        hint="Overpayments kept for the customer's next bill."
        icon={PiggyBank}
        tone="text-sky-400"
        items={deposits}
        empty="No open deposits."
        onOpen={setOpenId}
        showLabel
      />
      {openId && <MpesaTransactionModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
};

const Group = ({ title, hint, icon: Icon, tone, items, empty, onOpen, showLabel }) => {
  const total = items.reduce((s, t) => s + t.remaining, 0);
  return (
    <section className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
      <header className="px-4 py-3 border-b border-surface-700">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Icon size={16} className={tone} /> {title}
          </h2>
          <span className={`font-semibold tabular-nums ${tone}`}>{fmt(total)}</span>
        </div>
        <p className="text-xs text-surface-500 mt-1">{hint}</p>
      </header>
      {items.length === 0 ? (
        <div className="py-10 text-center text-surface-500 text-sm">
          <Smartphone size={28} className="mx-auto mb-2 text-surface-700" />
          {empty}
        </div>
      ) : (
        <ul className="divide-y divide-surface-700/50">
          {items.map((t) => {
            const age = ageLabel(t.transactionAt);
            return (
              <li key={t.id}>
                <button onClick={() => onOpen(t.id)} className="w-full text-left px-4 py-3 hover:bg-surface-700/30 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">
                      {showLabel ? t.depositLabel : t.payerName || "Unknown payer"}
                      {showLabel && t.payerName && <span className="text-surface-500"> · paid by {t.payerName}</span>}
                    </p>
                    <p className="text-xs text-surface-500">
                      <span className="font-mono">{t.receipt}</span> · {fmtDateTime(t.transactionAt)}
                      {t.remaining < t.amount && ` · of ${fmt(t.amount)}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${age.old ? "bg-red-500/15 text-red-300" : "bg-surface-700 text-surface-300"}`}>
                    {age.text}
                  </span>
                  <span className="text-white font-medium tabular-nums">{fmt(t.remaining)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default MpesaOpenItems;
