import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShoppingBag,
  Receipt,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BillsService } from "@/services/bills.service";
import { calculateBillTotals } from "@/utils/calculations";

const fmt = (n) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
  }).format(n || 0);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Returns Monday (00:00) of the week containing `date` */
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Returns Sunday (23:59:59) of the week starting on `monday` */
const getSunday = (monday) => {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 0);
  return d;
};

const toDateStr = (d) => d.toISOString().slice(0, 10);

/**
 * Returns all Mon-Sun week objects that overlap with the given year/month.
 * Each: { monday, sunday, label }
 */
const getWeeksForMonth = (year, month) => {
  // First day of month
  const firstDay = new Date(year, month, 1);
  // Last day of month
  const lastDay = new Date(year, month + 1, 0);

  const weeks = [];
  let monday = getMonday(firstDay);

  while (monday <= lastDay) {
    const sunday = getSunday(monday);
    weeks.push({ monday: new Date(monday), sunday });
    monday = new Date(monday);
    monday.setDate(monday.getDate() + 7);
  }
  return weeks;
};

const billTotal = (bill) => calculateBillTotals(bill).total;

const usePeriodSales = (startDate, endDate) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) return;
    let cancelled = false;
    setLoading(true);
    BillsService.list({ startDate, endDate, status: "paid,awaiting_confirmation", limit: 1000 })
      .then(({ bills }) => { if (!cancelled) setData(bills || []); })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  return { data, loading };
};

const summarise = (bills) => {
  if (!bills) return null;
  const revenue = bills.reduce((s, b) => s + billTotal(b), 0);
  const count = bills.length;
  return { revenue, count, avg: count > 0 ? revenue / count : 0 };
};

const DeltaBadge = ({ current, prev }) => {
  if (prev == null || current == null) return null;
  if (prev === 0) {
    return current > 0 ? (
      <span className="text-xs text-green-400 flex items-center gap-0.5"><TrendingUp size={12} /> New</span>
    ) : null;
  }
  const pct = ((current - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${up ? "text-green-400" : "text-red-400"}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
};

const StatCard = ({ icon: Icon, label, current, prev, format }) => (
  <div className="bg-gray-800/60 border border-purple-500/20 rounded-xl p-4 flex flex-col gap-2">
    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wide">
      <Icon size={14} className="text-purple-400" />
      {label}
    </div>
    <p className="text-white text-2xl font-bold">{format ? format(current) : current}</p>
    <DeltaBadge current={current} prev={prev} />
    {prev != null && (
      <p className="text-gray-500 text-xs">Prev: {format ? format(prev) : prev}</p>
    )}
  </div>
);

const NavArrow = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="p-1.5 rounded-lg bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
  >
    {children}
  </button>
);

const WeeklySalesView = () => {
  const now = new Date();
  const todayStr = toDateStr(now);

  // ── Month navigation ──────────────────────────────────────────────
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth()); // 0-indexed

  const goMonthPrev = () => {
    if (selMonth === 0) { setSelYear(y => y - 1); setSelMonth(11); }
    else setSelMonth(m => m - 1);
  };
  const goMonthNext = () => {
    if (selMonth === 11) { setSelYear(y => y + 1); setSelMonth(0); }
    else setSelMonth(m => m + 1);
  };
  // Don't allow navigating into the future beyond current month
  const isFutureMonth =
    selYear > now.getFullYear() ||
    (selYear === now.getFullYear() && selMonth >= now.getMonth());

  // ── Week list for selected month ──────────────────────────────────
  const weeks = useMemo(() => getWeeksForMonth(selYear, selMonth), [selYear, selMonth]);

  // Default selected week: current week index (or last week if viewing past month)
  const defaultWeekIdx = useMemo(() => {
    const currentMonday = toDateStr(getMonday(now));
    const idx = weeks.findIndex((w) => toDateStr(w.monday) === currentMonday);
    return idx >= 0 ? idx : weeks.length - 1;
  }, [weeks]); // eslint-disable-line react-hooks/exhaustive-deps

  const [selWeekIdx, setSelWeekIdx] = useState(defaultWeekIdx);

  // Reset week index whenever month changes
  const [prevMonth, setPrevMonth] = useState(selMonth);
  const [prevYear, setPrevYear] = useState(selYear);
  if (prevMonth !== selMonth || prevYear !== selYear) {
    setPrevMonth(selMonth);
    setPrevYear(selYear);
    setSelWeekIdx(defaultWeekIdx);
  }

  const selectedWeek = weeks[selWeekIdx] ?? weeks[weeks.length - 1];

  // ── Selected week date range (cap end at today) ───────────────────
  const thisStart = toDateStr(selectedWeek.monday);
  const thisEnd = toDateStr(
    selectedWeek.sunday > now ? now : selectedWeek.sunday
  );

  // ── Previous week ─────────────────────────────────────────────────
  const prevMonday = useMemo(() => {
    const d = new Date(selectedWeek.monday);
    d.setDate(d.getDate() - 7);
    return d;
  }, [selectedWeek]);
  const prevSunday = useMemo(() => {
    const d = new Date(selectedWeek.monday);
    d.setDate(d.getDate() - 1);
    d.setHours(23, 59, 59, 0);
    return d;
  }, [selectedWeek]);
  const prevStart = toDateStr(prevMonday);
  const prevEnd = toDateStr(prevSunday);

  // ── Data fetching ─────────────────────────────────────────────────
  const { data: thisBills, loading: thisLoading } = usePeriodSales(thisStart, thisEnd);
  const { data: prevBills, loading: prevLoading } = usePeriodSales(prevStart, prevEnd);

  const thisSummary = useMemo(() => summarise(thisBills), [thisBills]);
  const prevSummary = useMemo(() => summarise(prevBills), [prevBills]);

  // ── Per-day breakdown ─────────────────────────────────────────────
  const dayBreakdown = useMemo(() => {
    const map = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(selectedWeek.monday);
      d.setDate(d.getDate() + i);
      const key = toDateStr(d);
      map[key] = { label: DAY_LABELS[i], revenue: 0, count: 0, date: key };
    }
    for (const b of thisBills ?? []) {
      const key = (b.created_at || "").slice(0, 10);
      if (map[key]) {
        map[key].revenue += billTotal(b);
        map[key].count += 1;
      }
    }
    return Object.values(map);
  }, [thisBills, selectedWeek]);

  const maxRevenue = useMemo(
    () => Math.max(...dayBreakdown.map((d) => d.revenue), 1),
    [dayBreakdown]
  );

  // ── Top product per day ───────────────────────────────────────────
  const topProductPerDay = useMemo(() => {
    // Build a map: date → { productId → { name, qty, revenue } }
    const dayMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(selectedWeek.monday);
      d.setDate(d.getDate() + i);
      dayMap[toDateStr(d)] = {};
    }
    for (const bill of thisBills ?? []) {
      const dateKey = (bill.created_at || "").slice(0, 10);
      if (!dayMap[dateKey]) continue;
      for (const round of bill.rounds ?? []) {
        for (const item of round.round_items ?? []) {
          const pid = item.product?.id;
          const name = item.product?.name ?? "Unknown";
          const qty = Number(item.quantity || 0);
          const rev = qty * Number(item.price || 0);
          if (!pid) continue;
          if (!dayMap[dateKey][pid]) dayMap[dateKey][pid] = { name, qty: 0, revenue: 0 };
          dayMap[dateKey][pid].qty += qty;
          dayMap[dateKey][pid].revenue += rev;
        }
      }
    }
    // For each day, pick the product with the highest qty
    return Object.entries(dayMap).map(([date, products]) => {
      const entries = Object.values(products);
      if (!entries.length) return { date, top: null };
      const top = entries.reduce((best, p) => (p.qty > best.qty ? p : best), entries[0]);
      return { date, top };
    });
  }, [thisBills, selectedWeek]);

  const loading = thisLoading || prevLoading;

  // ── Week label helper ─────────────────────────────────────────────
  const weekLabel = (w) => {
    const s = w.monday.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
    const e = w.sunday.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
    return `${s} – ${e}`;
  };

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full pb-24 md:pb-4">

      {/* ── Month selector ── */}
      <div className="flex items-center justify-between bg-gray-800/60 border border-purple-500/20 rounded-xl px-4 py-3">
        <NavArrow onClick={goMonthPrev}>
          <ChevronLeft size={16} />
        </NavArrow>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{MONTH_NAMES[selMonth]} {selYear}</p>
          <p className="text-gray-500 text-xs flex items-center justify-center gap-1">
            <Calendar size={10} /> {weeks.length} week{weeks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <NavArrow onClick={goMonthNext} disabled={isFutureMonth}>
          <ChevronRight size={16} />
        </NavArrow>
      </div>

      {/* ── Week selector ── */}
      <div className="bg-gray-800/60 border border-purple-500/20 rounded-xl p-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Select Week</p>
        <div className="flex flex-wrap gap-2">
          {weeks.map((w, i) => {
            const isActive = i === selWeekIdx;
            const isFuture = w.monday > now;
            return (
              <button
                key={i}
                disabled={isFuture}
                onClick={() => setSelWeekIdx(i)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${isActive
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                    : isFuture
                    ? "bg-gray-800/40 text-gray-600 cursor-not-allowed"
                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white"
                  }
                `}
              >
                {weekLabel(w)}
              </button>
            );
          })}
        </div>
        <p className="text-gray-500 text-xs mt-2">
          Showing: <span className="text-gray-300">{thisStart} — {thisEnd}</span>
          &nbsp;·&nbsp;vs <span className="text-gray-400">{prevStart} — {prevEnd}</span>
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard icon={Receipt} label="Revenue"
              current={thisSummary?.revenue ?? 0} prev={prevSummary?.revenue ?? 0} format={fmt} />
            <StatCard icon={ShoppingBag} label="Bills"
              current={thisSummary?.count ?? 0} prev={prevSummary?.count ?? 0} />
            <StatCard icon={TrendingUp} label="Avg Bill"
              current={thisSummary?.avg ?? 0} prev={prevSummary?.avg ?? 0} format={fmt} />
          </div>

          {/* ── Daily bar chart ── */}
          <div className="bg-gray-800/60 border border-purple-500/20 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Daily Breakdown</p>
            <div className="flex items-end gap-2 h-32">
              {dayBreakdown.map((day) => {
                const pct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                const isToday = day.date === todayStr;
                const isFuture = day.date > todayStr;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end" style={{ height: "96px" }}>
                      <div
                        className={`w-full rounded-t transition-all ${
                          isToday ? "bg-purple-500" : isFuture ? "bg-gray-700/30" : "bg-purple-800/60"
                        }`}
                        style={{ height: `${Math.max(pct, day.revenue > 0 ? 4 : 0)}%` }}
                        title={fmt(day.revenue)}
                      />
                    </div>
                    <span className={`text-xs font-medium ${isToday ? "text-purple-300" : isFuture ? "text-gray-700" : "text-gray-500"}`}>
                      {day.label}
                    </span>
                    {day.count > 0 && <span className="text-xs text-gray-600">{day.count}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Per-day table ── */}
          <div className="bg-gray-800/60 border border-purple-500/20 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Day</th>
                  <th className="px-4 py-3 text-right">Bills</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {dayBreakdown.map((day) => {
                  const isToday = day.date === todayStr;
                  const isFuture = day.date > todayStr;
                  const avg = day.count > 0 ? day.revenue / day.count : 0;
                  return (
                    <tr key={day.date} className={`transition-colors ${isToday ? "bg-purple-500/10" : "hover:bg-gray-700/30"}`}>
                      <td className={`px-4 py-3 font-medium ${isToday ? "text-purple-300" : isFuture ? "text-gray-600" : "text-gray-300"}`}>
                        {day.label}
                        {isToday && <span className="ml-2 text-xs text-purple-400">(today)</span>}
                      </td>
                      <td className={`px-4 py-3 text-right ${isFuture ? "text-gray-700" : "text-gray-400"}`}>{day.count || "—"}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${day.revenue > 0 ? "text-white" : "text-gray-600"}`}>
                        {day.revenue > 0 ? fmt(day.revenue) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 font-mono hidden sm:table-cell">
                        {avg > 0 ? fmt(avg) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-900/50">
                <tr>
                  <td className="px-4 py-3 text-xs text-gray-400 uppercase font-semibold">Total</td>
                  <td className="px-4 py-3 text-right text-white font-bold">{thisSummary?.count ?? 0}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-white">{fmt(thisSummary?.revenue)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-400 hidden sm:table-cell">{fmt(thisSummary?.avg)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── Top product per day ── */}
          <div className="bg-gray-800/60 border border-purple-500/20 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700/50">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Top Seller Each Day</p>
            </div>
            <div className="divide-y divide-gray-700/50">
              {topProductPerDay.map(({ date, top }) => {
                const isToday = date === todayStr;
                const isFuture = date > todayStr;
                const dayLabel = DAY_LABELS[topProductPerDay.findIndex((r) => r.date === date)];
                return (
                  <div
                    key={date}
                    className={`flex items-center justify-between px-4 py-3 ${isToday ? "bg-purple-500/10" : ""}`}
                  >
                    <span className={`text-sm font-medium w-10 shrink-0 ${isToday ? "text-purple-300" : isFuture ? "text-gray-700" : "text-gray-400"}`}>
                      {dayLabel}
                    </span>
                    {top ? (
                      <div className="flex-1 flex items-center justify-between gap-3 ml-4">
                        <span className={`text-sm font-medium truncate ${isToday ? "text-white" : "text-gray-200"}`}>
                          {top.name}
                        </span>
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          <span className="text-xs text-gray-500">{top.qty} sold</span>
                          <span className="text-xs font-mono text-gray-400">{fmt(top.revenue)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className={`text-sm ml-4 ${isFuture ? "text-gray-700" : "text-gray-600"}`}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── vs Previous week ── */}
          <div className="bg-gray-800/60 border border-purple-500/20 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
              vs Previous Week&nbsp;
              <span className="normal-case text-gray-500">({prevStart} — {prevEnd})</span>
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Revenue", curr: thisSummary?.revenue, prev: prevSummary?.revenue, format: fmt },
                { label: "Bills", curr: thisSummary?.count, prev: prevSummary?.count, format: (n) => n },
                { label: "Avg Bill", curr: thisSummary?.avg, prev: prevSummary?.avg, format: fmt },
              ].map(({ label, curr, prev, format }) => {
                const pct = prev > 0 ? ((curr - prev) / prev) * 100 : null;
                const up = pct >= 0;
                return (
                  <div key={label}>
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    {pct != null ? (
                      <p className={`text-lg font-bold flex items-center justify-center gap-1 ${up ? "text-green-400" : "text-red-400"}`}>
                        {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {Math.abs(pct).toFixed(1)}%
                      </p>
                    ) : (
                      <p className="text-gray-500 flex items-center justify-center gap-1"><Minus size={14} /> N/A</p>
                    )}
                    <p className="text-xs text-gray-600 mt-0.5">{format(curr ?? 0)} this week</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WeeklySalesView;
