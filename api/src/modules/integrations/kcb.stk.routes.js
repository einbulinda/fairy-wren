const express = require("express");
const rateLimit = require("express-rate-limit");
const stkService = require("../mpesa/stk.service");
const logger = require("../../utils/logger");

const router = express.Router();

/**
 * POST /kcb/stk/:token — KCB's M-Pesa Express (STK Push) result callback.
 *
 * Public: mounted before authMiddleware and exempt from the global API rate
 * limiter. The callback is not signed, so it is trusted only for a request we
 * sent: the URL carries a one-time secret token (we store its hash), the
 * MerchantRequestID must match, and the amount and phone must equal the
 * prompt before money is applied (apply_mpesa_stk_callback).
 *
 * The path is short on purpose: KCB limits callbackUrl to 50 characters.
 */
const callbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

const ACK = { ResultCode: 0, ResultDesc: "Accepted" };

router.post("/stk/:token", callbackLimiter, async (req, res) => {
  try {
    await stkService.handleCallback({
      token: req.params.token,
      body: req.body,
      correlationId: req.correlationId,
    });
    // Also for ignored callbacks: nothing for KCB to retry, and no hint to a prober.
    res.status(200).json(ACK);
  } catch (err) {
    // e.g. database unavailable — non-200 so KCB retries (handling is idempotent).
    logger.error("[KCB STK] Failed to process callback", {
      error: err.message,
      stack: err.stack,
      correlationId: req.correlationId,
    });
    res.status(500).json({ ResultCode: 1, ResultDesc: "Temporary error, please retry" });
  }
});

module.exports = router;
