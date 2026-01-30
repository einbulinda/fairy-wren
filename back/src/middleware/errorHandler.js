const logger = require("../utils/logger");

module.exports = (err, req, res, next) => {
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      user: req.user?.id,
    },
    err.message,
  );
  const statusMap = {
    PRODUCT_NOT_FOUND: 404,
    INVALID_PRODUCT_DATA: 400,
  };

  res.status(statusMap[err.message] || 500).json({
    success: false,
    error: {
      code: err.message,
      message: "An unexpected error occurred",
    },
  });
};
