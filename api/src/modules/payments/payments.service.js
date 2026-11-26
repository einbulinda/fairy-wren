const paymentsCommandRepo = require("./payments.command.repository");
const paymentsReadRepo = require("./payments.read.repository");
const paymentsBillsReadRepo = require("./payments.bills.read.repository");
const auditRepo = require("../audit/audit.repository");
const settingsRepo = require("../settings/settings.repository");

/** Setting `mpesa_require_ipn` ("true"/"false"). Off when unset or unreadable. */
const isIpnRequired = async () => {
  const { data } = await settingsRepo.getByKey("mpesa_require_ipn");
  return data?.value === "true";
};

/* ======================================================
   PROCESS PAYMENT (RPC)
   ====================================================== */

/**
 * Process a payment against a bill
 * v1: processPayment
 */

exports.processPayments = async (payload, context) => {
  const { billId, payments } = payload;

  if (!billId || !Array.isArray(payments)) {
    throw new Error("INVALID_PAYMENT_DATA");
  }

  // Once KCB notifications are trusted, owners can switch off typed M-Pesa
  // amounts: M-Pesa must then come through /mpesa/.../allocate instead.
  if (payments.some((p) => p?.method === "mpesa") && (await isIpnRequired())) {
    throw new Error("MPESA_IPN_REQUIRED");
  }

  const { data, error } = await paymentsCommandRepo.processPayment({
    billId,
    payments,
    userId: context.userId,
    permissions: context.permissions,
  });

  if (error) {
    console.log("SERVICE", error);
    throw new Error("FAILED_TO_PROCESS_PAYMENT");
  }

  await auditRepo.log({
    entity: "payments",
    entity_id: data?.payment_id ?? billId,
    action: "PAYMENT_PROCESSED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      billId,
      payments,
    },
  });

  return data;
};

/* ======================================================
   LIST PAYMENTS (READ)
   ====================================================== */

/**
 * List payments filtered by type / date / paid status
 */
exports.listPayments = async (filters = {}) => {
  const { type, from, to } = filters;

  const { data, error } = await paymentsReadRepo.listPayments({
    type,
    from,
    to,
  });

  if (error) {
    throw new Error("FAILED_TO_FETCH_PAYMENTS");
  }

  return data;
};

/* ======================================================
   FETCH BILLS WITH PAYMENTS (READ)
   ====================================================== */

/**
 * v1: fetchBillsWithPayments
 */
exports.fetchBillsWithPayments = async (filters) => {
  const { data, error } =
    await paymentsBillsReadRepo.fetchBillsWithPayments(filters);

  if (error) {
    throw new Error("FAILED_TO_FETCH_BILLS_WITH_PAYMENTS");
  }

  return data;
};
