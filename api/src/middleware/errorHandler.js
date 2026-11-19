const logger = require("../utils/logger");
const { ERROR_MAP } = require("../utils/error.map");

module.exports = (err, req, res, next) => {
  // connect-timeout fires its own error ("Response timeout", err.timeout set)
  const code = err.timeout ? "REQUEST_TIMEOUT" : err.message || "INTERNAL_ERROR";
  const mapped = ERROR_MAP[code] || ERROR_MAP.INTERNAL_ERROR;

  // A response already went out (typically the timeout's 503, then the slow
  // handler fails later). Writing again throws ERR_HTTP_HEADERS_SENT, so only log.
  if (res.headersSent) {
    logger.warn({
      errorCode: code,
      path: req.originalUrl,
      method: req.method,
      correlationId: req.correlationId,
      details: err.details,
      note: "error after response was sent (request had timed out)",
    });
    return;
  }

  // 4xx are expected client errors (bad PIN, validation…) → warn, no stack.
  // 5xx are real failures → error, with the stack so the log viewer shows where.
  const isServerError = mapped.status >= 500;
  logger.log({
    level: isServerError ? "error" : "warn",
    message: code,
    type: "error",
    errorCode: code,
    status: mapped.status,
    path: req.originalUrl,
    method: req.method,
    correlationId: req.correlationId,
    userId: req.user?.id,
    details: err.details,
    ...(isServerError && err.stack && { stack: err.stack }),
    ...(isServerError && err.code && { cause: err.code }),
  });

  // Build error response
  const errorResponse = {
    success: false,
    error: {
      code,
      message: mapped.message,
    },
  };

  if (err.details && Array.isArray(err.details)) {
    errorResponse.error.details = err.details;
  }

  if (err.lockRemainingSeconds) {
    errorResponse.error.lockRemainingSeconds = err.lockRemainingSeconds;
  }

  res.status(mapped.status).json(errorResponse);
};
