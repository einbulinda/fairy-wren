/**
 * M-Pesa Express (STK Push): the cashier sends a PIN prompt for a bill; KCB's
 * callback (or the till IPN) applies the payment. See
 * plans/KCB_STK_PUSH_IMPLEMENTATION_PLAN.md and migration 20261126_002.
 *
 * Configuration (api/.env):
 *   KCB_STK_ENABLED=true          shows the POS button and allows prompts
 *   KCB_STK_TILL_NUMBER           our KCB till (invoiceNumber prefix)
 *   KCB_STK_CALLBACK_BASE         callback address up to the token, e.g.
 *                                 https://api.fairywren.co.ke/kcb/stk/ (production, served by this API)
 *                                 https://api.fairywren.co.ke/kcb/qa/  (QA, nginx → QA API /kcb/stk/)
 *                                 The token is appended; the whole URL must be ≤ 50 chars.
 *   KCB_STK_INVOICE_SEPARATOR     "-" (PDF) or "#" (Postman); default "-"
 *   KCB_STK_DESCRIPTION           shown on the prompt; default "Fairy Wren"
 *   + Buni credentials, see integrations/buni.client.js
 */
const crypto = require("crypto");
const repo = require("./stk.repository");
const mpesaRepo = require("./mpesa.repository");
const buni = require("../integrations/buni.client");
const auditRepo = require("../audit/audit.repository");
const logger = require("../../utils/logger");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[A-Za-z0-9]{10,12}$/;
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Prompt lifetime before it is marked "no response" (plan §2). */
const PROMPT_TIMEOUT_SECONDS = 180;
/** Minimum gap between prompts for the same bill (plan §4.3). */
const RESEND_COOLDOWN_SECONDS = 20;
/** M-Pesa's per-transaction maximum. */
const MAX_AMOUNT = 250000;
const CALLBACK_MAX_LENGTH = 50;
/** Callback token length: 12 when the URL allows, never below 10 (~59 bits). */
const TOKEN_MAX_LENGTH = 12;
const TOKEN_MIN_LENGTH = 10;

/** Longest token that keeps base + /kcb/stk/ + token within KCB's 50 characters. */
const tokenLength = (callbackBase) =>
  Math.min(TOKEN_MAX_LENGTH, CALLBACK_MAX_LENGTH - callbackBase.length - 1); // 1 = "/"

const fail = (code, detail) => {
  const err = new Error(code);
  if (detail) err.details = [detail];
  return err;
};

/* ======================================================
   CONFIGURATION
   ====================================================== */

function config() {
  return {
    enabled: process.env.KCB_STK_ENABLED === "true",
    mock: buni.isMock(),
    till: (process.env.KCB_STK_TILL_NUMBER || "").trim(),
    callbackBase: (process.env.KCB_STK_CALLBACK_BASE || "").trim().replace(/\/+$/, ""),
    separator: process.env.KCB_STK_INVOICE_SEPARATOR || "-",
    description: (process.env.KCB_STK_DESCRIPTION || "Fairy Wren").slice(0, 30),
  };
}

/** What is missing or wrong in the configuration (empty when ready). */
function configProblems(cfg = config()) {
  const problems = [];
  if (!cfg.till) problems.push("KCB_STK_TILL_NUMBER is not set");
  if (!cfg.callbackBase) problems.push("KCB_STK_CALLBACK_BASE is not set");
  else {
    if (!cfg.mock && !cfg.callbackBase.startsWith("https://")) {
      problems.push("KCB_STK_CALLBACK_BASE must be https");
    }
    if (tokenLength(cfg.callbackBase) < TOKEN_MIN_LENGTH) {
      const length = cfg.callbackBase.length + 1 + TOKEN_MIN_LENGTH;
      problems.push(`callback URL would be ${length} characters; KCB allows ${CALLBACK_MAX_LENGTH}`);
    }
  }
  if (!cfg.mock && (!process.env.KCB_CONSUMER_KEY || !process.env.KCB_CONSUMER_SECRET)) {
    problems.push("KCB_CONSUMER_KEY / KCB_CONSUMER_SECRET are not set");
  }
  if (`${cfg.till}${cfg.separator}FW0000`.length > 30) {
    problems.push("invoiceNumber would exceed 30 characters");
  }
  return problems;
}

/* ======================================================
   HELPERS
   ====================================================== */

/** "0712 345 678" / "712345678" / "+254712345678" / "0112…" → "2547…"/"2541…", else null. */
function normalizeStkPhone(input) {
  const digits = String(input ?? "").replace(/[\s-]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  let n = digits;
  if (/^0[17]\d{8}$/.test(n)) n = `254${n.slice(1)}`;
  else if (/^[17]\d{8}$/.test(n)) n = `254${n}`;
  return /^254[17]\d{8}$/.test(n) ? n : null;
}

/** `length` random base62 characters (12 ≈ 71 bits) for the callback URL. */
function newCallbackToken(length = TOKEN_MAX_LENGTH) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (const b of bytes) out += BASE62[b % 62];
  return out;
}

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/** KCB "yyyyMMddHHmmss" (EAT) → Date, or null. */
function parseKcbTimestamp(v) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(String(v ?? "").trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const maskMsisdn = (s) => (s ? `${s.slice(0, 4)}****${s.slice(-3)}` : null);

const canSeePhone = (context) =>
  ["owner", "admin"].includes(context?.role) ||
  (context?.permissions ?? []).includes("manage_mpesa") ||
  false;

function statusText(row) {
  switch (row.status) {
    case "pending":
    case "waiting":
      return "Waiting for the customer to enter their M-Pesa PIN";
    case "paid":
      return row.problem ? `Paid — ${row.problem}` : "Paid";
    case "cancelled":
      return "Cancelled by the customer";
    case "failed":
      return row.result_code === 2001 ? "Wrong M-Pesa PIN" : row.result_desc || "Payment failed";
    case "no_response":
      return row.result_code === 1037 ? "Customer's phone could not be reached" : "No response from the customer";
    case "request_failed":
      return `Prompt could not be sent${row.result_desc ? `: ${row.result_desc}` : ""}`;
    default:
      return row.status;
  }
}

function toDto(row, context) {
  const own = context?.userId && row.requested_by === context.userId;
  const created = new Date(row.created_at);
  return {
    id: row.id,
    billId: row.bill_id,
    billName: row.bill_name,
    amount: Number(row.amount),
    accountRef: row.account_ref,
    phone: own || canSeePhone(context) ? row.phone : maskMsisdn(row.phone),
    status: row.status,
    active: ["pending", "waiting"].includes(row.status),
    statusText: statusText(row),
    resultCode: row.result_code,
    resultDesc: row.result_desc,
    receipt: row.mpesa_receipt,
    paidAmount: row.paid_amount == null ? null : Number(row.paid_amount),
    paidAt: row.paid_at,
    paidVia: row.paid_via,
    transactionId: row.mpesa_transaction_id,
    problem: row.problem,
    requestedBy: row.requested_by,
    requestedByName: row.requested_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: new Date(created.getTime() + PROMPT_TIMEOUT_SECONDS * 1000).toISOString(),
  };
}

/* ======================================================
   POS
   ====================================================== */

exports.getConfig = async () => {
  const cfg = config();
  return {
    enabled: cfg.enabled && configProblems(cfg).length === 0,
    mock: cfg.mock,
    timeoutSeconds: PROMPT_TIMEOUT_SECONDS,
    resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
    maxAmount: MAX_AMOUNT,
  };
};

/**
 * Send a PIN prompt to the customer's phone for (part of) a bill.
 * @param {{ billId:string, phone:string, amount:number|string }} input
 */
exports.initiate = async (input, context) => {
  const cfg = config();
  if (!cfg.enabled) throw fail("MPESA_STK_DISABLED");
  const problems = configProblems(cfg);
  if (problems.length) {
    logger.error("[KCB STK] Not configured", { problems });
    throw fail("MPESA_STK_NOT_CONFIGURED", problems.join("; "));
  }

  const billId = input?.billId;
  if (!UUID_RE.test(billId || "")) throw fail("MPESA_BILL_NOT_FOUND");

  const phone = normalizeStkPhone(input?.phone);
  if (!phone) throw fail("MPESA_STK_INVALID_PHONE");

  const amount = Number(input?.amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
    throw fail("MPESA_STK_INVALID_AMOUNT", `whole shillings from 1 to ${MAX_AMOUNT.toLocaleString()}`);
  }

  const bill = await mpesaRepo.getPayableBill(billId);
  if (!bill) throw fail("MPESA_BILL_NOT_FOUND");
  if (!["open", "awaiting_confirmation"].includes(bill.status)) throw fail("MPESA_BILL_NOT_PAYABLE");
  if (amount > Number(bill.payable_amount)) {
    throw fail("MPESA_EXCEEDS_BILL_BALANCE", `bill can take at most ${Number(bill.payable_amount)}`);
  }

  const state = await repo.getBillPromptState(billId);
  if (state?.active) throw fail("MPESA_STK_ALREADY_ACTIVE");
  if (state?.seconds_since_last != null && state.seconds_since_last < RESEND_COOLDOWN_SECONDS) {
    throw fail("MPESA_STK_TOO_SOON", `try again in ${RESEND_COOLDOWN_SECONDS - state.seconds_since_last}s`);
  }

  const token = newCallbackToken(tokenLength(cfg.callbackBase));
  let row;
  try {
    row = await repo.createRequest({ billId, userId: context.userId, phone, amount, tokenHash: hashToken(token) });
    if (!row) throw fail("MPESA_BILL_NOT_FOUND");
  } catch (err) {
    if (err.code === "23505" && /one_active_per_bill/.test(err.constraint || err.message)) {
      throw fail("MPESA_STK_ALREADY_ACTIVE");
    }
    throw err;
  }

  try {
    const sent = await buni.stkPush({
      phone,
      amount,
      invoiceNumber: `${cfg.till}${cfg.separator}${row.account_ref}`,
      callbackUrl: `${cfg.callbackBase}/${token}`,
      description: cfg.description,
      messageId: `${row.account_ref}-${Date.now()}`,
    });
    await repo.markSent(row.id, sent);
  } catch (err) {
    if (err instanceof buni.BuniError && err.kind === "timeout") {
      // KCB may still have sent the prompt; the callback (or the sweeper) decides.
      logger.warn("[KCB STK] Push timed out; waiting for a callback", { id: row.id, ref: row.account_ref });
      await repo.markUnconfirmed(row.id, "KCB did not confirm the request");
    } else {
      logger.error("[KCB STK] Push failed", { id: row.id, ref: row.account_ref, kind: err.kind, error: err.message });
      await repo.markRequestFailed(row.id, { desc: err.message, response: err.response });
      throw fail("MPESA_STK_REQUEST_FAILED", err.message);
    }
  }

  try {
    await auditRepo.log({
      entity: "mpesa_stk_requests",
      entity_id: row.id,
      action: "STK_PUSH_SENT",
      performed_by: context.userId,
      correlation_id: context.correlationId,
      metadata: { bill_id: billId, amount, account_ref: row.account_ref },
    });
  } catch (err) {
    logger.error("[KCB STK] Audit log failed", { id: row.id, error: err.message });
  }

  return toDto(await repo.getRequest(row.id), context);
};

exports.getRequest = async (id, context) => {
  if (!UUID_RE.test(id || "")) throw fail("MPESA_STK_NOT_FOUND");
  const row = await repo.getRequest(id);
  if (!row) throw fail("MPESA_STK_NOT_FOUND");
  return toDto(row, context);
};

exports.listForBill = async (billId, context) => {
  if (!UUID_RE.test(billId || "")) throw fail("MPESA_BILL_NOT_FOUND");
  const rows = await repo.listForBill(billId);
  return rows.map((r) => toDto(r, context));
};

/* ======================================================
   KCB CALLBACK (public)
   ====================================================== */

/**
 * Record KCB's result for a prompt. Unknown tokens and malformed bodies are
 * logged and ignored (the caller still answers 200 so KCB stops retrying).
 * @returns {Promise<object|null>} the database result, or null when ignored
 */
exports.handleCallback = async ({ token, body, correlationId }) => {
  if (!TOKEN_RE.test(token || "")) {
    logger.warn("[KCB STK] Callback with malformed token ignored", { correlationId });
    return null;
  }
  const req = await repo.getByTokenHash(hashToken(token));
  if (!req) {
    logger.warn("[KCB STK] Callback for unknown token ignored", { correlationId });
    return null;
  }

  const cb = body?.Body?.stkCallback;
  const resultCode = Number(cb?.ResultCode);
  if (!cb || cb.ResultCode === undefined || Number.isNaN(resultCode)) {
    logger.warn("[KCB STK] Callback without Body.stkCallback.ResultCode ignored", { id: req.id, correlationId });
    return null;
  }

  const items = Object.fromEntries(
    (Array.isArray(cb.CallbackMetadata?.Item) ? cb.CallbackMetadata.Item : [])
      .filter((i) => i && i.Name)
      .map((i) => [i.Name, i.Value]),
  );
  const amount = Number(items.Amount);
  const receipt = items.MpesaReceiptNumber ? String(items.MpesaReceiptNumber).trim() : null;
  const rawPhone = items.PhoneNumber == null ? null : String(items.PhoneNumber);

  const result = await repo.applyCallback({
    requestId: req.id,
    merchantRequestId: cb.MerchantRequestID ? String(cb.MerchantRequestID) : null,
    checkoutRequestId: typeof cb.CheckoutRequestID === "string" ? cb.CheckoutRequestID : null,
    resultCode,
    resultDesc: cb.ResultDesc ? String(cb.ResultDesc).slice(0, 500) : null,
    receipt,
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    phone: normalizeStkPhone(rawPhone) || rawPhone,
    paidAt: parseKcbTimestamp(items.TransactionDate),
    raw: body,
  });

  const log = result?.problem || result?.applied === false ? logger.warn : logger.info;
  log.call(logger, "[KCB STK] Callback", { id: req.id, resultCode, receipt, result, correlationId });

  try {
    await auditRepo.log({
      entity: "mpesa_stk_requests",
      entity_id: req.id,
      action: "STK_CALLBACK",
      performed_by: null,
      correlation_id: correlationId,
      metadata: { result_code: resultCode, receipt, result },
    });
  } catch (err) {
    logger.error("[KCB STK] Audit log failed", { id: req.id, error: err.message });
  }

  return result;
};

/* ======================================================
   SWEEPER + IPN LINK
   ====================================================== */

/** Mark prompts with no answer after PROMPT_TIMEOUT_SECONDS as "no response". */
exports.expireStale = async () => {
  const count = await repo.expireStale(PROMPT_TIMEOUT_SECONDS);
  if (count > 0) logger.info("[KCB STK] Prompts expired with no response", { count });
  return count;
};

/** Called by the IPN handler for each new till notification. */
exports.linkIpn = (txnId) => repo.linkIpn(txnId);

exports._internal = {
  normalizeStkPhone,
  newCallbackToken,
  tokenLength,
  hashToken,
  parseKcbTimestamp,
  configProblems,
  statusText,
  toDto,
  PROMPT_TIMEOUT_SECONDS,
  RESEND_COOLDOWN_SECONDS,
};
