const express = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("./kcb.controller");

const router = express.Router();

/**
 * Public routes called by KCB — mounted before authMiddleware and exempt from
 * the global API rate limiter (see apiRateLimiter). Authenticity comes from
 * the RSA signature on every request.
 *
 * This limiter only guards against floods; it's far above real peak volume.
 */
const ipnLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/ipn/till", ipnLimiter, controller.tillNotification);

module.exports = router;
