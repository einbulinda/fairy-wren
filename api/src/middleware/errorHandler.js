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
    },
    err.stack || code,
  );

  console.log("ERROR", err);

  res.status(mapped.status).json({
    success: false,
    error: {
      code,
      message: mapped.message,
    },
  });
};
