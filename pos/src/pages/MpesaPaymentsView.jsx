import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Smartphone,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Gift,
  PiggyBank,
  CircleDollarSign,
} from "lucide-react";
import { MpesaService, mpesaErrorMessage } from "@/services/mpesa.service";
import { useAppStore } from "@/store/app.store";
import { formatCurrency, titleCase } from "@/utils/common";

const REFRESH_MS = 60_000;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "closed", label: "Closed a bill" },
  { id: "owing", label: "Bill still owing" },
  { id: "excess", label: "Excess" },
  { id: "unmatched", label: "Not matched" },
];

const matchesFilter = (p, filter) => {
  switch (filter) {
    case "closed":
      return p.bills.some((b) => b.closed);
    case "owing":
      return p.bills.some((b) => !b.closed && b.outstanding > 0);
    case "excess":
      return p.excess > 0;
    case "unmatched":
      return p.unallocated > 0;
    default:
      return true;
  }
};

const fmtTime = (d) =>
  new Date(d)
    .toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
    })
    .replace(",", "");

/** 2547****827 → 07****827 (the API already masks it). */
const localPhone = (p) => (p ? String(p).replace(/^254/, "0") : "—");

const Badge = ({ tone, icon: Icon, children }) => {
  const tones = {
    green: "bg-green-500/20 text-green-400",
    yellow: "bg-yellow-500/20 text-yellow-400",
    orange: "bg-orange-500/20 text-orange-400",
    purple: "bg-purple-500/20 text-purple-300",
    blue: "bg-sky-500/20 text-sky-300",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${tones[tone]}`}>
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
};

const SummaryCard = ({ label, value, sub, tone = "text-white" }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
    <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
    <p className={`text-lg font-bold ${tone}`}>{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
  </div>
);

const PaymentCard = ({ p }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
    {/* Payment */}
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-mono font-semibold text-white">{p.receipt}</p>
        <p className="text-sm text-gray-300 truncate">{titleCase(p.payerName) || "—"}</p>
        <p className="text-xs text-gray-500">
          {localPhone(p.phone)} · {fmtTime(p.transactionAt)}
          {p.source === "kcb_stk" && " · Prompt"}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-lg font-bold text-green-400">{formatCurrency(p.amount)}</p>
        {p.matchedBy && <p className="text-[11px] text-gray-500">Matched: {p.matchedBy}</p>}
      </div>
    </div>

    {/* Bills it paid */}
    {p.bills.length > 0 && (
      <div className="space-y-1.5">
        {p.bills.map((b) => (
          <div key={b.billId} className="flex items-center justify-between gap-2 bg-gray-900/50 rounded-lg px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm text-white truncate">{titleCase(b.customerName) || "—"}</p>
              <p className="text-xs text-gray-500">
                <span className="font-mono">{b.invoiceNumber}</span> · paid {formatCurrency(b.applied)} of{" "}
                {formatCurrency(b.total)}
              </p>
            </div>
            {b.closed ? (
              <Badge tone="green" icon={CheckCircle2}>Closed</Badge>
            ) : b.outstanding > 0 ? (
              <Badge tone="yellow" icon={Clock}>Owes {formatCurrency(b.outstanding)}</Badge>
            ) : (
              <Badge tone="blue">{titleCase(b.status)}</Badge>
            )}
          </div>
        ))}
      </div>
    )}

    {/* Excess beyond the bills */}
    {(p.tips > 0 || p.deposit > 0 || p.unallocated > 0 || p.possibleDuplicate) && (
      <div className="flex flex-wrap gap-1.5">
        {p.tips > 0 && (
          <Badge tone="purple" icon={Gift}>
            Tip {formatCurrency(p.tips)}
            {p.tipNames ? ` · ${p.tipNames}` : ""}
          </Badge>
        )}
        {p.deposit > 0 && (
          <Badge tone="blue" icon={PiggyBank}>
            Deposit {formatCurrency(p.deposit)}
            {p.depositLabel ? ` · ${p.depositLabel}` : ""}
          </Badge>
        )}
        {p.unallocated > 0 && (
          <Badge tone="orange" icon={CircleDollarSign}>
            {p.bills.length ? "Excess not matched" : "Not matched"} {formatCurrency(p.unallocated)}
          </Badge>
        )}
        {p.possibleDuplicate && (
          <Badge tone="orange" icon={AlertTriangle}>Possible duplicate — manager to check</Badge>
        )}
      </div>
    )}
  </div>
);

const MpesaPaymentsView = () => {
  const reloadTrigger = useAppStore((s) => s.mpesaReloadTrigger);
  const billsReloadTrigger = useAppStore((s) => s.billsReloadTrigger);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await MpesaService.recent());
      setError("");
    } catch (err) {
      setError(mpesaErrorMessage(err, "Could not load M-Pesa payments"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load, live updates (new or matched payments, bill changes) and a slow refresh.
  useEffect(() => {
    load();
  }, [load, reloadTrigger, billsReloadTrigger]);
  useEffect(() => {
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return (data?.items || []).filter((p) => {
      if (!matchesFilter(p, filter)) return false;
      if (!term) return true;
      const text = [
        p.receipt,
        p.payerName,
        ...p.bills.flatMap((b) => [b.customerName, b.invoiceNumber]),
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(term) || (digits.length >= 3 && localPhone(p.phone).replace(/\D/g, "").includes(digits));
    });
  }, [data, filter, q]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, (data?.items || []).filter((p) => matchesFilter(p, f.id)).length])),
    [data],
  );

  const t = data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Smartphone size={20} className="text-green-400" /> M-Pesa Payments
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Last {data?.hours ?? 48} hours · updates automatically</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {t && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
          <SummaryCard label="Received" value={formatCurrency(t.received)} sub={`${t.count} payment${t.count === 1 ? "" : "s"}`} tone="text-green-400" />
          <SummaryCard label="Applied to bills" value={formatCurrency(t.toBills)} />
          <SummaryCard label="Bills closed" value={t.billsClosed} tone="text-green-400" />
          <SummaryCard
            label="Still owing"
            value={formatCurrency(t.outstanding)}
            sub={`${t.billsWithBalance} bill${t.billsWithBalance === 1 ? "" : "s"}`}
            tone="text-yellow-400"
          />
          <SummaryCard
            label="Excess"
            value={formatCurrency(t.excess)}
            sub={[
              t.tips > 0 && `Tips ${formatCurrency(t.tips)}`,
              t.deposits > 0 && `Deposits ${formatCurrency(t.deposits)}`,
              t.unallocated > 0 && `Not matched ${formatCurrency(t.unallocated)}`,
            ]
              .filter(Boolean)
              .join(" · ") || null}
            tone="text-orange-400"
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code, payer, customer, invoice, last digits"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.id ? "bg-yellow-500 text-gray-900" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${filter === f.id ? "bg-black/20" : "bg-gray-700"}`}>
              {counts[f.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {!data && loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Smartphone size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="text-sm">{data?.items?.length ? "No payments match" : "No M-Pesa payments in the last 48 hours"}</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((p) => (
            <PaymentCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {data?.truncated && (
        <p className="text-xs text-gray-500 text-center">Showing the latest {data.items.length} payments.</p>
      )}
    </div>
  );
};

export default MpesaPaymentsView;
