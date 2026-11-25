const service = require("./kcb.service");
const logger = require("../../utils/logger");

/**
 * POST /integrations/kcb/ipn/till
 *
 * Public endpoint called by KCB. Always answers in KCB's ack format (never
 * the app's { success, error } envelope), so errors are handled here rather
 * than passed to the global error handler.
 */
exports.tillNotification = async (req, res) => {
  try {
    const { httpStatus, ack } = await service.handleTillNotification({
      body: req.body,
      rawBody: req.rawBody,
      signature: req.get("signature"),
      correlationId: req.correlationId,
    });
    res.status(httpStatus).json(ack);
  } catch (err) {
    // e.g. database unavailable — non-200 so KCB retries later.
    logger.error("[KCB IPN] Failed to process till notification", {
      error: err.message,
      stack: err.stack,
      messageID: req.body?.header?.messageID,
      correlationId: req.correlationId,
    });
    res
      .status(500)
      .json(service.buildAck(req.body, { ok: false, message: "Temporary error, please retry" }));
  }
};
