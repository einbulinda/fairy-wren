const logger = require("../utils/logger");

// Not worth a log line on every call (health checks, the log viewer polling itself).
const SKIP = [/^\/health/, /^\/system-logs/];
const SLOW_MS = 3000;

/**
 * One log line per request: method, path, status, duration, user.
 * Level: warn for 4xx/5xx or slow requests, info otherwise. (Errors with
 * stack traces are logged separately by errorHandler.)
 *
 * NB: must take exactly 3 arguments — with 4, Express treats it as an error
 * handler and it never runs for normal requests.
 */
module.exports = (req, res, next) => {
  if (SKIP.some((re) => re.test(req.path))) return next();
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Math.round(Number(process.hrtime.bigint() - start) / 1_000_000);
    const level = res.statusCode >= 400 || durationMs >= SLOW_MS ? "warn" : "info";
    logger.log({
      level,
      message: `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`,
      type: "request",
      correlationId: req.correlationId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?.id,
      ip: req.ip,
    });
  });

  next();
};
