const path = require("path");
const util = require("util");
const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

const isProduction = process.env.NODE_ENV === "production";

/** Absolute so files land in api/logs no matter where pm2 starts the process. */
const LOG_DIR = process.env.LOG_DIR || path.resolve(__dirname, "../../logs");

/**
 * Callers log either a string or an object (`logger.error({ errorCode, path })`).
 * Winston then stores the object under `message`, which is hard to read and
 * search. Lift object fields to the top level and derive a readable message.
 */
const normalize = format((info) => {
  if (info.message && typeof info.message === "object" && !(info.message instanceof Error)) {
    const obj = info.message;
    Object.assign(info, obj);
    info.message =
      obj.msg || obj.errorCode || obj.event ||
      (obj.method && obj.path ? `${obj.method} ${obj.path}${obj.statusCode ? ` ${obj.statusCode}` : ""}` : "") ||
      JSON.stringify(obj).slice(0, 200);
  }
  return info;
});

const fileFormat = format.combine(normalize(), format.timestamp(), format.errors({ stack: true }), format.json());

const appFile = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: "app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  format: fileFormat,
});

const errorFile = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: "error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  level: "error",
  maxSize: "20m",
  maxFiles: "30d",
  format: fileFormat,
});

const level = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

const logger = createLogger({
  level,
  transports: [new transports.Console({ format: fileFormat }), appFile, errorFile],
});

/** File-only logger used to mirror console.* output without printing it twice. */
const fileLogger = createLogger({ level, transports: [appFile, errorFile] });

// Console lines that are pure noise in the files (still printed to pm2 output).
const NOISE = [/^\[WebSocket\] Broadcasting /, /^\[WebSocket\] User .* (subscribed|unsubscribed) /, /^\[RequestCache\]/];

/**
 * Much of the code base (and Node itself for uncaught errors) writes with
 * console.*. Mirror those calls into the log files so the ERP log viewer sees
 * them too. Original console output is unchanged.
 */
let consoleCaptured = false;
function captureConsole() {
  if (consoleCaptured) return;
  consoleCaptured = true;
  const map = { error: "error", warn: "warn", info: "info", log: "info", debug: "debug" };
  for (const [method, lvl] of Object.entries(map)) {
    const original = console[method].bind(console);
    console[method] = (...args) => {
      original(...args);
      try {
        const err = args.find((a) => a instanceof Error);
        // One-line message; the stack goes in its own field.
        const text = util.format(...args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : a)));
        if (NOISE.some((re) => re.test(text))) return;
        fileLogger.log({
          level: lvl,
          message: text.length > 4000 ? `${text.slice(0, 4000)}…` : text,
          source: "console",
          ...(err && { stack: err.stack, errorCode: err.code }),
        });
      } catch {
        /* never let logging break the app */
      }
    };
  }
}

module.exports = logger;
module.exports.LOG_DIR = LOG_DIR;
module.exports.captureConsole = captureConsole;
