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

  // Include detailed error messages if available (e.g., for INSUFFICIENT_STOCK)
  if (err.details && Array.isArray(err.details)) {
    errorResponse.error.details = err.details;
  }

  res.status(mapped.status).json(errorResponse);
};
