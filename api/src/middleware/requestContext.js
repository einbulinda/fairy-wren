const { randomUUID } = require("crypto");

module.exports = (req, res, next) => {
  const correlationId = req.headers["x-correlation-id"] || randomUUID();
  req.correlationId = correlationId;
  res.locals.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);
  next();
};
