import { useEffect, useMemo, useState } from "react";
import {
  Download, Smartphone, ChevronLeft, ChevronRight, AlertTriangle, Search, X,
  Wallet, Receipt, Gift, PiggyBank, CircleAlert, Calculator,
} from "lucide-react";
import { useMpesaRegister } from "@/hooks/useMpesa";
import { MobileCard, MobileField, MobileCardList } from "@/components/shared/MobileCard";
import { fmt, fmtDateTime, localDateStr } from "@/utils/formatters";
import MpesaTransactionModal from "./MpesaTransactionModal";

const PAGE_SIZE = 25;

const STATUS_STYLES = {
  unallocated: { label: "Unmatched", cls: "bg-amber-500/15 text-amber-300" },
  partially_allocated: { label: "Part matched", cls: "bg-orange-500/15 text-orange-300" },
  allocated: { label: "Matched", cls: "bg-emerald-500/15 text-emerald-400" },
};

/* ── Periods ──────────────────────────────────────────────────────────────── */

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const PERIODS = [
  { key: "today", label: "Today", range: () => [localDateStr(), localDateStr()] },
  { key: "yesterday", label: "Yesterday", range: () => { const y = localDateStr(addDays(new Date(), -1)); return [y, y]; } },
  {
    key: "week", label: "This week",
    range: () => { const now = new Date(); const monday = addDays(now, -((now.getDay() + 6) % 7)); return [localDateStr(monday), localDateStr(now)]; },
  },
  {
    key: "month", label: "This month",
    range: () => { const now = new Date(); return [localDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), localDateStr(now)]; },
  },
  {
    key: "last-month", label: "Last month",
    range: () => {
      const now = new Date();
      return [localDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1)), localDateStr(new Date(now.getFullYear(), now.getMonth(), 0))];
    },
  },
  { key: "custom", label: "Custom" },
];

/* ── CSV ──────────────────────────────────────────────────────────────────── */

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function downloadCsv(items, from, to) {
  const header = [
    "Received", "M-Pesa code", "Payer", "Mobile", "Amount", "To bills", "Bills",
    "Tips", "Tip for", "Left", "Deposit for", "Status", "Matched by", "Customer reference",
  ];
  const rows = items.map((i) => [
    new Date(i.transactionAt).toISOString(), i.receipt, i.payerName, i.phone, i.amount,
    i.billsAmount, i.billNames, i.tipsAmount, i.tipNames, i.remaining,
    i.remaining > 0 ? i.depositLabel : "", STATUS_STYLES[i.status]?.label ?? i.status,
    i.matchedBy, i.billReference,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `mpesa-payments_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── View ─────────────────────────────────────────────────────────────────── */

/**
 * M-Pesa payments for a period: summary cards and a searchable table
 * (M-Pesa code, payer name, or mobile in any format: 0712…, 712…, +254712…).
 */
const MpesaRegister = () => {
  const [period, setPeriod] = useState("today");
  const [[from, to], setRange] = useState(PERIODS[0].range());
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const choosePeriod = (key) => {
    setPeriod(key);
    setPage(1);
    const p = PERIODS.find((x) => x.key === key);
    if (p.range) setRange(p.range());
  };

  const params = useMemo(
    () => ({ from, to, ...(status && { status }), ...(q && { q }) }),
    [from, to, status, q],
  );
  const { data, isLoading, isFetching, isError } = useMpesaRegister(params);
  const items = data?.items ?? [];
  const totals = data?.totals;

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const matchedCell = (i) => (
    <>
      {i.billsAmount > 0 && <p className="text-surface-200">{fmt(i.billsAmount)} <span className="text-surface-500">· {i.billNames}</span></p>}
      {i.tipsAmount > 0 && <p className="text-amber-300 text-xs">Tip {fmt(i.tipsAmount)} · {i.tipNames}</p>}
      {i.billsAmount === 0 && i.tipsAmount === 0 && <span className="text-surface-600">—</span>}
    </>
  );

  return (
    <div className="space-y-5">
      {/* Period */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-surface-800/50 border border-surface-700 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => choosePeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                period === p.key ? "bg-primary-500/20 text-primary-300" : "text-surface-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={from} max={to} aria-label="From date"
              onChange={(e) => { setRange([e.target.value, to]); setPage(1); }}
              className="flex-1 md:flex-none px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none" />
            <span className="text-surface-500 shrink-0">→</span>
            <input type="date" value={to} min={from} aria-label="To date"
              onChange={(e) => { setRange([from, e.target.value]); setPage(1); }}
              className="flex-1 md:flex-none px-3 py-1.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none" />
          </div>
        )}
      </div>

      {/* Summary cards for the period (and current search/status filter) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <SummaryCard icon={Wallet} label="Received" value={totals && fmt(totals.received)}
          sub={totals && `${totals.count} payment${totals.count === 1 ? "" : "s"}`} loading={isLoading} />
        <SummaryCard icon={Receipt} label="Applied to bills" value={totals && fmt(totals.toBills)} tone="text-emerald-400" loading={isLoading} />
        <SummaryCard icon={Gift} label="Tips" value={totals && fmt(totals.tips)} tone="text-amber-300" loading={isLoading} />
        <SummaryCard icon={PiggyBank} label="Deposits held" value={totals && fmt(totals.deposits)} tone="text-sky-400" loading={isLoading} />
        <SummaryCard icon={CircleAlert} label="Unmatched" value={totals && fmt(totals.unmatched)}
          tone={totals?.unmatched > 0 ? "text-red-400" : "text-white"} loading={isLoading} />
        <SummaryCard icon={Calculator} label="Average payment"
          value={totals && fmt(totals.count ? totals.received / totals.count : 0)} loading={isLoading} />
      </div>

      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        {/* Search + filters */}
        <div className="p-4 border-b border-surface-700 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by M-Pesa code, name or mobile (e.g. FT25139M3RM6, Peter, 0712345678)"
              aria-label="Search M-Pesa payments"
              className="w-full pl-9 pr-9 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-surface-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            aria-label="Status"
            className="px-3 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="unallocated">Unmatched</option>
            <option value="partially_allocated">Part matched</option>
            <option value="allocated">Matched</option>
          </select>
          <button
            onClick={() => downloadCsv(items, from, to)}
            disabled={!items.length}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-200 text-sm rounded-lg"
          >
            <Download size={14} /> Export
          </button>
        </div>

        {q && !isLoading && (
          <p className="px-4 py-2 text-xs text-surface-400 border-b border-surface-700/50">
            {items.length} result{items.length === 1 ? "" : "s"} for “{q}”{isFetching && " · updating…"}
          </p>
        )}
        {data?.truncated && (
          <p className="px-4 py-2 text-xs text-amber-300 bg-amber-500/10 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Showing the latest {items.length} payments only. Pick a shorter period to see all.
          </p>
        )}

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <p className="py-16 text-center text-red-400 text-sm">Couldn't load M-Pesa payments.</p>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-surface-500">
            <Smartphone size={36} className="mx-auto mb-3 text-surface-700" />
            <p>{q ? `No payments match “${q}” in this period` : "No M-Pesa payments in this period"}</p>
            {q && period !== "month" && (
              <button onClick={() => choosePeriod("month")} className="mt-2 text-sm text-primary-400 hover:text-primary-300">
                Search this month instead
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-900/50 border-b border-surface-700">
                  <tr>
                    {[
                      ["Date & time", "left"], ["M-Pesa code", "left"], ["Payer", "left"], ["Mobile", "left"],
                      ["Amount", "right"], ["Matched to", "left"], ["Left", "right"], ["Status", "left"],
                    ].map(([h, align]) => (
                      <th key={h} className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"} text-xs font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/50">
                  {pageItems.map((i) => {
                    const s = STATUS_STYLES[i.status] ?? STATUS_STYLES.unallocated;
                    return (
                      <tr key={i.id} onClick={() => setOpenId(i.id)} className="hover:bg-surface-700/30 cursor-pointer">
                        <td className="px-4 py-3 text-surface-300 whitespace-nowrap">{fmtDateTime(i.transactionAt)}</td>
                        <td className="px-4 py-3 font-mono text-primary-400 whitespace-nowrap">{i.receipt}</td>
                        <td className="px-4 py-3 text-white">{i.payerName || "—"}</td>
                        <td className="px-4 py-3 text-surface-300 font-mono whitespace-nowrap">{i.phone || "—"}</td>
                        <td className="px-4 py-3 text-right text-white font-medium tabular-nums whitespace-nowrap">{fmt(i.amount)}</td>
                        <td className="px-4 py-3">{matchedCell(i)}</td>
                        <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                          {i.remaining > 0 ? (
                            <>
                              <p className={i.depositLabel ? "text-sky-400" : "text-amber-300"}>{fmt(i.remaining)}</p>
                              {i.depositLabel && <p className="text-xs text-surface-500">Deposit: {i.depositLabel}</p>}
                            </>
                          ) : <span className="text-surface-600">—</span>}
                        </td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${s.cls}`}>{s.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <MobileCardList>
              {pageItems.map((i) => {
                const s = STATUS_STYLES[i.status] ?? STATUS_STYLES.unallocated;
                return (
                  <MobileCard key={i.id} onClick={() => setOpenId(i.id)}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-primary-400 text-sm">{i.receipt}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm">{i.payerName || "—"}</span>
                      <span className="text-white font-semibold tabular-nums">{fmt(i.amount)}</span>
                    </div>
                    <MobileField label="Mobile"><span className="font-mono">{i.phone || "—"}</span></MobileField>
                    <MobileField label="Received">{fmtDateTime(i.transactionAt)}</MobileField>
                    <div className="text-sm">{matchedCell(i)}</div>
                    {i.remaining > 0 && (
                      <MobileField label={i.depositLabel ? `Deposit: ${i.depositLabel}` : "Unmatched"}>{fmt(i.remaining)}</MobileField>
                    )}
                  </MobileCard>
                );
              })}
            </MobileCardList>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700">
                <span className="text-sm text-surface-400">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, items.length)} of {items.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300" aria-label="Previous page">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 text-xs text-surface-400">{safePage} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    className="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-40 text-surface-300" aria-label="Next page">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {openId && <MpesaTransactionModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, sub, tone = "text-white", loading }) => (
  <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
    <p className="text-xs text-surface-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
      <Icon size={13} className="text-surface-500" /> {label}
    </p>
    <p className={`text-lg font-bold tabular-nums ${tone}`}>{loading ? "…" : value}</p>
    {sub && !loading && <p className="text-xs text-surface-500 mt-0.5">{sub}</p>}
  </div>
);

/** Plain stat card, shared with the other M-Pesa views. */
export const Stat = ({ label, value, sub, tone = "text-white" }) => (
  <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
    <p className="text-xs text-surface-400 uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
    {sub && <p className="text-xs text-surface-500 mt-0.5">{sub}</p>}
  </div>
);

export default MpesaRegister;
