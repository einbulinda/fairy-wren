const repo = require("./kcb.repository");
const { verifySignature } = require("./kcb.signature");
const auditRepo = require("../audit/audit.repository");
const logger = require("../../utils/logger");

/* ======================================================
   PARSING HELPERS
   ====================================================== */

const str = (v) => (v === undefined || v === null ? null : String(v).trim() || null);

/** "1000" | "100.00" | 1000 → 1000.00, or null if not a positive amount. */
function parseAmount(v) {
  const s = str(v);
  if (!s || !/^\d+(\.\d{1,2})?$/.test(s.replace(/,/g, ""))) return null;
  const n = Number(s.replace(/,/g, ""));
  return n > 0 ? n : null;
}

/** KCB header timeStamp "yyyyMMddHHmmss" (EAT, UTC+3) → Date, or null. */
function parseKcbTimestamp(v) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(str(v) || "");
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Normalise a till notification into a mpesa_transactions row.
 * @returns {{ row?: object, errors: string[] }}
 */
function parseTillNotification(body, { signatureValid, receivedAt = new Date() }) {
  const errors = [];
  const header = body?.header ?? {};
  const primary = body?.requestPayload?.primaryData ?? {};
  const data = body?.requestPayload?.additionalData?.notificationData ?? {};

  const transactionId = str(data.transactionID);
  const amount = parseAmount(data.transactionAmt);

  if (!transactionId) errors.push("notificationData.transactionID is required");
  if (!amount) errors.push("notificationData.transactionAmt must be a positive amount");
  if (errors.length) return { errors };

  return {
    errors,
    row: {
      source: "kcb_till",
      transactionId,
      messageId: str(header.messageID),
      originatorConversationId: str(header.originatorConversationID),
      channelCode: str(header.channelCode),
      businessKey: str(primary.businessKey),
      billReference: str(data.businessKey),
      msisdn: str(data.debitMSISDN),
      firstName: str(data.firstName),
      middleName: str(data.middleName),
      lastName: str(data.lastName),
      amount,
      currency: str(data.currency) || "KES",
      transactionType: str(data.transactionType),
      narration: str(data.narration),
      transactionDateRaw: str(data.transactionDate),
      // transactionDate has no fixed format; the header timestamp does.
      transactionAt: parseKcbTimestamp(header.timeStamp) || receivedAt,
      rawPayload: body,
      signatureValid,
    },
  };
}

/** Response body in the format KCB expects. statusCode "0" = success, "1" = failure. */
function buildAck(body, { ok, message, transactionId = null }) {
  const header = body?.header ?? {};
  return {
    header: {
      messageID: header.messageID ?? "",
      originatorConversationID: header.originatorConversationID ?? "",
      statusCode: ok ? "0" : "1",
      statusMessage: message,
    },
    responsePayload: {
      transactionInfo: { transactionId: transactionId ?? "" },
    },
  };
}

/* ======================================================
   TILL NOTIFICATION
   ====================================================== */

/** KCB_IPN_POST_RECEIPT_JOURNAL=true → journal each receipt on arrival (after go-live). */
const receiptJournalEnabled = () => process.env.KCB_IPN_POST_RECEIPT_JOURNAL === "true";

/**
 * @returns {{ httpStatus: number, ack: object }}
 */
exports.handleTillNotification = async ({ body, rawBody, signature, correlationId }) => {
  const sig = verifySignature({ rawBody, body, signature });

  if (!sig.valid) {
    logger.warn("[KCB IPN] Rejected notification: invalid signature", {
      reason: sig.reason,
      messageID: body?.header?.messageID,
      correlationId,
    });
    return {
      httpStatus: 401,
      ack: buildAck(body, { ok: false, message: "Invalid signature" }),
    };
  }

  const { row, errors } = parseTillNotification(body, { signatureValid: true });
  if (!row) {
    logger.warn("[KCB IPN] Rejected notification: invalid payload", {
      errors,
      messageID: body?.header?.messageID,
      correlationId,
    });
    return {
      httpStatus: 400,
      ack: buildAck(body, { ok: false, message: `Invalid request: ${errors.join("; ")}` }),
    };
  }

  const { id, inserted } = await repo.insertTransactionIdempotent(row);

  logger.info("[KCB IPN] Notification received", {
    id,
    transactionID: row.transactionId,
    amount: row.amount,
    duplicate: !inserted,
    signatureMatchedOn: sig.matchedOn,
    correlationId,
  });

  if (inserted) {
    // The notification is safely stored; journal and audit failures must not
    // fail the ack (KCB would retry).
    //
    // Receipt journal (Dr 1020 / Cr 2300) is opt-in: while KCB runs UAT against
    // the production endpoint, test notifications must not reach the books.
    // When off, the receipt journal is posted later, when the payment is
    // matched to a bill.
    if (receiptJournalEnabled()) {
      try {
        await repo.postReceiptJournal(id);
      } catch (err) {
        logger.error("[KCB IPN] Receipt journal failed", { id, error: err.message });
      }
    }

    try {
      await auditRepo.log({
        entity: "mpesa_transactions",
        entity_id: id,
        action: "IPN_RECEIVED",
        performed_by: null,
        correlation_id: correlationId,
        metadata: { transactionID: row.transactionId, amount: row.amount, source: row.source },
      });
    } catch (err) {
      logger.error("[KCB IPN] Audit log failed", { id, error: err.message });
    }
  }

  return {
    httpStatus: 200,
    ack: buildAck(body, {
      ok: true,
      message: "Notification received successfully",
      transactionId: id,
    }),
  };
};

exports.buildAck = buildAck;
exports._internal = { parseAmount, parseKcbTimestamp, parseTillNotification };
