exports.mapActionToMessage = (action) => {
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
