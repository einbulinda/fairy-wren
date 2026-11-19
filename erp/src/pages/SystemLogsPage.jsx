import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  AlertOctagon, AlertTriangle, Info, Activity, Search, X, RefreshCw, Download,
  ChevronDown, ChevronRight, Radio, Clock, ScrollText,
} from "lucide-react";
import { fetchSystemLogs, downloadLogFile } from "@/services/systemLogs.service";
import { useUsers } from "@/hooks/useUsers";
import { localDateStr } from "@/utils/formatters";
import { dateInputCls } from "@/utils/constants";

const LIVE_MS = 5000;

const LEVELS = [
  { key: "error", label: "Errors", icon: AlertOctagon, badge: "bg-red-500/15 text-red-300 border-red-500/30", dot: "bg-red-500" },
  { key: "warn", label: "Warnings", icon: AlertTriangle, badge: "bg-amber-500/15 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
  { key: "info", label: "Info", icon: Info, badge: "bg-sky-500/15 text-sky-300 border-sky-500/30", dot: "bg-sky-400" },
];
const LEVEL = Object.fromEntries(LEVELS.map((l) => [l.key, l]));

// Fields shown in the row itself; everything else goes in the details panel.
const SHOWN = new Set(["id", "level", "message", "timestamp", "stack", "type"]);

const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Africa/Nairobi" }) : "—";

const timeAgo = (ts) => {
  if (!ts) return "None";
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : new Date(ts).toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi" });
};

/**
 * Administration → System Logs. Reads the API's production log files:
 * every request (status, duration, user), warnings, and errors with stack
 * traces. "Live" re-reads every 5 s while viewing today.
 */
const SystemLogsPage = () => {
  const today = localDateStr();
  const [date, setDate] = useState(today);
  const [levels, setLevels] = useState(["error", "warn"]); // start focused on problems
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [live, setLive] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());
  const [hideRequests, setHideRequests] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const isToday = date === today;
  const params = useMemo(
    () => ({ date, levels: levels.join(","), ...(q && { q }), limit: 1000 }),
    [date, levels, q],
  );

  const { data, isLoading, isError, error, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["system-logs", params],
    queryFn: () => fetchSystemLogs(params),
    refetchInterval: live && isToday ? LIVE_MS : false,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
  });

  const { data: usersData } = useUsers();
  const userName = useMemo(() => {
    const list = Array.isArray(usersData) ? usersData : usersData?.users ?? [];
    return Object.fromEntries(list.map((u) => [u.id, u.name]));
  }, [usersData]);

  // Briefly highlight rows that arrived since the previous refresh.
  const seen = useRef(new Set());
  const [fresh, setFresh] = useState(() => new Set());
  useEffect(() => {
    if (!data?.entries) return;
    const first = seen.current.size === 0;
    const incoming = data.entries.filter((e) => !seen.current.has(e.id)).map((e) => e.id);
    incoming.forEach((id) => seen.current.add(id));
    if (!first && incoming.length) {
      setFresh(new Set(incoming));
      const t = setTimeout(() => setFresh(new Set()), 2500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [data]);
  useEffect(() => { seen.current = new Set(); }, [params]);

  const entries = useMemo(
    () => (data?.entries ?? []).filter((e) => !(hideRequests && e.type === "request")),
    [data, hideRequests],
  );
  const counts = data?.counts ?? { error: 0, warn: 0, info: 0, requests: 0 };

  const toggleLevel = (key) =>
    setLevels((prev) => (prev.includes(key) ? (prev.length > 1 ? prev.filter((l) => l !== key) : prev) : [...prev, key]));

  const toggleRow = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const download = async (name) => {
    try {
      await downloadLogFile(name);
    } catch {
      toast.error("Couldn't download the log file");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="lg:mr-auto">
          <h1 className="text-xl font-bold text-white">System Logs</h1>
          <p className="text-sm text-surface-400 mt-0.5">
            Production API logs: requests, warnings and errors with stack traces
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className={dateInputCls}
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
            aria-label="Log date"
          />
          <button
            onClick={() => setLive((l) => !l)}
            disabled={!isToday}
            title={isToday ? "Refresh every 5 seconds" : "Live is only available for today"}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 ${
              live && isToday
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-surface-800 border-surface-600 text-surface-300 hover:text-white"
            }`}
          >
            <Radio size={14} className={live && isToday ? "animate-pulse" : ""} />
            {live && isToday ? "Live" : "Paused"}
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg bg-surface-800 border border-surface-600 text-surface-300 hover:text-white"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Day summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={AlertOctagon} label="Errors" value={counts.error} tone={counts.error ? "text-red-400" : "text-white"} />
        <Card icon={AlertTriangle} label="Warnings" value={counts.warn} tone={counts.warn ? "text-amber-300" : "text-white"} />
        <Card icon={Activity} label="Requests" value={counts.requests} />
        <Card icon={Clock} label="Last error" value={timeAgo(data?.lastErrorAt)} small
          sub={data?.lastErrorAt ? fmtTime(data.lastErrorAt) : null} tone={data?.lastErrorAt ? "text-red-300" : "text-white"} />
      </div>

      <div className="bg-surface-800/50 border border-surface-700 rounded-xl overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-surface-700 flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {LEVELS.map(({ key, label, icon: Icon, badge }) => {
              const on = levels.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleLevel(key)}
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    on ? badge : "border-surface-600 text-surface-400 hover:text-white"
                  }`}
                >
                  <Icon size={13} /> {label}
                  <span className="tabular-nums opacity-80">{counts[key] ?? 0}</span>
                </button>
              );
            })}
            <label className="inline-flex items-center gap-2 px-2 text-sm text-surface-400 cursor-pointer select-none">
              <input type="checkbox" checked={hideRequests} onChange={(e) => setHideRequests(e.target.checked)} className="accent-primary-500" />
              Hide request lines
            </label>
          </div>
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search message, path, error code, correlation id…"
              aria-label="Search logs"
              className="w-full pl-9 pr-9 py-2 bg-surface-900 border border-surface-600 rounded-lg text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-surface-500 hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>
          {data?.files?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.files.map((f) => (
                <button key={f} onClick={() => download(f)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-surface-200 text-xs rounded-lg"
                  title={`Download ${f}`}>
                  <Download size={12} /> {f.startsWith("error") ? "Errors file" : "Full log"}
                </button>
              ))}
            </div>
          )}
        </div>

        {data && (
          <p className="px-4 py-2 text-xs text-surface-500 border-b border-surface-700/50 flex flex-wrap gap-x-3">
            <span>
              {entries.length} entr{entries.length === 1 ? "y" : "ies"} shown
              {data.truncated && ` (newest ${data.entries.length} of ${data.matched})`}
            </span>
            {dataUpdatedAt > 0 && <span>Updated {fmtTime(dataUpdatedAt)}</span>}
          </p>
        )}

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <p className="py-16 text-center text-red-400 text-sm">
            {error?.response?.status === 403
              ? "You don't have permission to view system logs."
              : error?.response?.data?.error?.message || "Couldn't load the logs."}
          </p>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-surface-500">
            <ScrollText size={34} className="mx-auto mb-3 text-surface-700" />
            <p>{q ? `Nothing matches “${q}”` : levels.includes("info") ? "No log entries for this day" : "No errors or warnings for this day 🎉"}</p>
          </div>
        ) : (
          <ul className="divide-y divide-surface-700/50 font-mono text-xs">
            {entries.map((e) => {
              const lv = LEVEL[e.level] ?? LEVEL.info;
              const open = expanded.has(e.id);
              const extra = Object.entries(e).filter(([k, v]) => !SHOWN.has(k) && v !== undefined && v !== null && v !== "");
              const who = e.userId ? userName[e.userId] || `${String(e.userId).slice(0, 8)}…` : null;
              return (
                <li key={e.id} className={`transition-colors ${fresh.has(e.id) ? "bg-primary-500/10" : ""}`}>
                  <button onClick={() => toggleRow(e.id)} className="w-full text-left px-4 py-2.5 hover:bg-surface-700/30 flex items-start gap-3">
                    {open ? <ChevronDown size={14} className="text-surface-500 mt-0.5 shrink-0" /> : <ChevronRight size={14} className="text-surface-500 mt-0.5 shrink-0" />}
                    <span className="text-surface-400 shrink-0 tabular-nums">{fmtTime(e.timestamp)}</span>
                    <span className={`shrink-0 px-1.5 rounded border uppercase text-[10px] leading-5 ${lv.badge}`}>{e.level}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`break-words ${e.level === "error" ? "text-red-200" : "text-surface-100"}`}>{e.message}</span>
                      <span className="block text-surface-500 mt-0.5 font-sans">
                        {[
                          e.type === "request" ? null : e.method && e.path ? `${e.method} ${e.path}` : null,
                          e.status ? `HTTP ${e.status}` : null,
                          who ? `by ${who}` : null,
                          e.cause,
                          e.source === "console" ? "console" : null,
                        ].filter(Boolean).join(" · ")}
                        {e.stack && <span className="text-red-400"> · stack trace</span>}
                      </span>
                    </span>
                  </button>
                  {open && (
                    <div className="px-4 pb-3 pl-11 space-y-2">
                      {extra.length > 0 && (
                        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 font-sans text-xs">
                          {extra.map(([k, v]) => (
                            <div key={k} className="contents">
                              <dt className="text-surface-500">{k}</dt>
                              <dd className="text-surface-200 break-all font-mono">
                                {k === "userId" && userName[v] ? `${userName[v]} (${v})` : typeof v === "object" ? JSON.stringify(v) : String(v)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {e.stack && (
                        <div className="overflow-x-auto rounded-lg bg-surface-950 border border-surface-700">
                          <pre className="p-3 text-[11px] leading-relaxed text-red-200 whitespace-pre">{e.stack}</pre>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(JSON.stringify(e, null, 2)).then(
                            () => toast.success("Copied log entry"),
                            () => toast.error("Couldn't copy"),
                          );
                        }}
                        className="font-sans text-xs text-primary-400 hover:text-primary-300"
                      >
                        Copy entry as JSON
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

const Card = ({ icon: Icon, label, value, sub, tone = "text-white", small }) => (
  <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4">
    <p className="text-xs text-surface-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
      <Icon size={13} className="text-surface-500" /> {label}
    </p>
    <p className={`${small ? "text-base" : "text-xl"} font-bold tabular-nums ${tone}`}>{value}</p>
    {sub && <p className="text-xs text-surface-500 mt-0.5">{sub}</p>}
  </div>
);

export default SystemLogsPage;
