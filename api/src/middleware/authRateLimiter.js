const rateLimit = require("express-rate-limit");

const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    error: {
      code: "TOO_MANY_LOGIN_ATTEMPTS",
      message: "Too many login attempts. Please try again later.",
    },
  },

  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  },
});

module.exports = authRateLimiter;
