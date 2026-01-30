const mapActionToMessage = (action) => {
  switch (action) {
    case "payment_initiated":
      return "Payment initiated. Awaiting bartender confirmation.";
    case "payment_confirmed":
      return "Payment confirmed and bill completed.";
    case "direct_payment_completed":
      return "Payment completed successfully.";
    default:
      return "Payment processed.";
  }
};

const buildContext = (req) => ({
  userId: req.user?.id,
  correlationId: req.correlationId,
});

const respond = (res, status, data) => {
  if (res.locals.correlationId)
    res.setHeader("X-Request-ID", res.locals.correlationId);

  return res.status(status).json({ success: true, data });
};

module.exports = { mapActionToMessage, buildContext, respond };
