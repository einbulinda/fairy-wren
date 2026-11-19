const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { LOG_DIR } = require("../../utils/logger");

/** app-YYYY-MM-DD.log, error-YYYY-MM-DD.log, plus size-rotation shards (.1, .2 …). */
const FILE_RE = /^(app|error)-(\d{4}-\d{2}-\d{2})\.log(?:\.(\d+))?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LEVELS = ["error", "warn", "info", "debug"];
const MAX_LINE = 20000; // characters kept per entry (huge stacks/payloads are cut)

const fail = (code, detail) => Object.assign(new Error(code), detail ? { details: [detail] } : {});

const todayEAT = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());

const shiftDate = (date, days) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

async function readDirSafe() {
  try {
    return await fs.promises.readdir(LOG_DIR);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

/** All log files, newest first. */
exports.listFiles = async () => {
  const names = (await readDirSafe()).filter((n) => FILE_RE.test(n));
  const files = await Promise.all(
    names.map(async (name) => {
      const [, kind, date, shard] = FILE_RE.exec(name);
      const st = await fs.promises.stat(path.join(LOG_DIR, name));
      return { name, kind, date, shard: shard ? Number(shard) : 0, size: st.size, modifiedAt: st.mtime };
    }),
  );
  return files.sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind) || b.shard - a.shard);
};

/**
 * Files that can hold entries for an EAT calendar day. File names use the
 * server's local date, which may differ from EAT, so the neighbouring days are
 * read too and entries are filtered by timestamp. The app log has every level;
 * for days it has already been rotated away (kept 14 days) the error log
 * (kept 30 days) is used instead.
 */
async function filesForDay(date) {
  const all = await exports.listFiles();
  const days = [shiftDate(date, -1), date, shiftDate(date, 1)];
  const chosen = [];
  for (const d of days) {
    const app = all.filter((f) => f.date === d && f.kind === "app");
    const pick = app.length ? app : all.filter((f) => f.date === d && f.kind === "error");
    chosen.push(...pick.sort((a, b) => a.shard - b.shard)); // chronological within the day
  }
  return chosen;
}

async function forEachLine(file, onLine) {
  const stream = fs.createReadStream(path.join(LOG_DIR, file), { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    n += 1;
    if (line.trim()) onLine(line, n);
  }
}

function parseLine(line) {
  try {
    const obj = JSON.parse(line);
    if (obj && typeof obj === "object") {
      // Older entries stored an object under `message` — flatten for display.
      if (obj.message && typeof obj.message === "object") {
        const inner = obj.message;
        Object.assign(obj, inner);
        obj.message = inner.errorCode || inner.msg || JSON.stringify(inner).slice(0, 200);
      }
      return obj;
    }
  } catch {
    /* not JSON */
  }
  return { level: "info", message: line, unparsed: true };
}

/**
 * Entries for one EAT day, newest first.
 * @param {{ date?: string, levels?: string, q?: string, since?: string, limit?: string|number }} query
 */
exports.getEntries = async (query = {}) => {
  const date = query.date || todayEAT();
  if (!DATE_RE.test(date)) throw fail("LOGS_INVALID_FILTER", "date must be YYYY-MM-DD");

  const levels = query.levels
    ? String(query.levels).split(",").map((l) => l.trim()).filter((l) => LEVELS.includes(l))
    : LEVELS;
  const q = typeof query.q === "string" ? query.q.trim().toLowerCase().slice(0, 200) : "";
  const since = query.since ? Date.parse(query.since) : null;
  if (query.since && Number.isNaN(since)) throw fail("LOGS_INVALID_FILTER", "since must be an ISO timestamp");
  const limit = Math.min(2000, Math.max(1, parseInt(query.limit, 10) || 500));

  const start = Date.parse(`${date}T00:00:00+03:00`);
  const end = start + 24 * 3600 * 1000;

  const counts = { error: 0, warn: 0, info: 0, debug: 0, requests: 0 };
  let lastErrorAt = null;
  let matched = 0;
  const kept = []; // ring of the newest `limit` matches (files are read oldest → newest)

  const files = await filesForDay(date);
  for (const f of files) {
    await forEachLine(f.name, (line, lineNo) => {
      const entry = parseLine(line);
      const ts = Date.parse(entry.timestamp);
      if (!Number.isNaN(ts) && (ts < start || ts >= end)) return;
      if (Number.isNaN(ts) && f.date !== date) return; // undated line: only from the day's own file

      const level = LEVELS.includes(entry.level) ? entry.level : "info";
      counts[level] += 1;
      if (entry.type === "request") counts.requests += 1;
      if (level === "error" && (!lastErrorAt || entry.timestamp > lastErrorAt)) lastErrorAt = entry.timestamp;

      if (!levels.includes(level)) return;
      if (since !== null && !(ts > since)) return;
      if (q && !line.toLowerCase().includes(q)) return;

      matched += 1;
      const text = line.length > MAX_LINE ? null : entry;
      kept.push({
        id: `${f.name}:${lineNo}`,
        ...(text || { level, timestamp: entry.timestamp, message: String(entry.message).slice(0, 2000), truncated: true }),
        level,
      });
      if (kept.length > limit) kept.shift();
    });
  }

  kept.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));

  return {
    date,
    entries: kept,
    matched,
    truncated: matched > kept.length,
    counts,
    lastErrorAt,
    files: files.filter((f) => f.date === date).map((f) => f.name),
    serverTime: new Date().toISOString(),
  };
};

/** Absolute path of a log file, or throws if the name isn't a known log file. */
exports.resolveFile = async (name) => {
  if (typeof name !== "string" || path.basename(name) !== name || !FILE_RE.test(name)) {
    throw fail("LOG_FILE_NOT_FOUND");
  }
  const full = path.join(LOG_DIR, name);
  try {
    await fs.promises.access(full, fs.constants.R_OK);
  } catch {
    throw fail("LOG_FILE_NOT_FOUND");
  }
  return full;
};

exports._internal = { parseLine, shiftDate, FILE_RE };
