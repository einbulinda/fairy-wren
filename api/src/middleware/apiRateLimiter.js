const rateLimit = require("express-rate-limit");

const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests. Please slow down.",
    },
  },

  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  },
});

module.exports = apiRateLimiter;
