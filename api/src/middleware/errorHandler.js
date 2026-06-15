const logger = require("../utils/logger");
const { ERROR_MAP } = require("../utils/error.map");

module.exports = (err, req, res, next) => {
  const code = err.message || "INTERNAL_ERROR";
  const mapped = ERROR_MAP[code] || ERROR_MAP.INTERNAL_ERROR;

  logger.error(
    {
      errorCode: code,
      path: req.originalUrl,
      method: req.method,
      correlationId: req.correlationId,
      userId: req.user?.id,
      details: err.details,
    },
    err.stack || code,
  );

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
