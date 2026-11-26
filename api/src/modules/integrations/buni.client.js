/**
 * KCB Buni gateway client: OAuth token + M-Pesa Express (STK Push).
 * Spec: KCB M-Pesa STK Push API Specification v1.0 and the Buni Postman
 * collection (see plans/KCB_STK_PUSH_IMPLEMENTATION_PLAN.md §2).
 *
 * Configuration (api/.env, never committed):
 *   KCB_BUNI_BASE_URL         required; the only address setting, e.g.
 *                             https://uat.buni.kcbgroup.com (UAT). The resource
 *                             paths are fixed in code (TOKEN_PATH, STK_PATH).
 *   KCB_CONSUMER_KEY          from the Buni developer portal
 *   KCB_CONSUMER_SECRET
 *   KCB_STK_MOCK=true         development only: no call to KCB; a fake
 *                             callback is posted back to this API (see mockStkPush)
 *
 * Every call is logged (System Logs) with secrets and phone numbers redacted.
 */
const crypto = require("crypto");
const logger = require("../../utils/logger");

const TIMEOUT_MS = 10_000;
const TOKEN_REFRESH_EARLY_MS = 60_000;

// Only the host changes between UAT and production; the paths are KCB's.
const TOKEN_PATH = "/token?grant_type=client_credentials";
const STK_PATH = "/mm/api/request/1.0.0/stkpush";

const baseUrl = () => {
  const base = (process.env.KCB_BUNI_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!base) throw new BuniError("config", "KCB_BUNI_BASE_URL is not set");
  return base;
};
const tokenUrl = () => `${baseUrl()}${TOKEN_PATH}`;
const stkUrl = () => `${baseUrl()}${STK_PATH}`;

const isMock = () =>
  process.env.KCB_STK_MOCK === "true" && process.env.NODE_ENV !== "production";

const maskPhone = (p) =>
  p ? `${String(p).slice(0, 4)}****${String(p).slice(-3)}` : p;

class BuniError extends Error {
  /** @param {"timeout"|"network"|"auth"|"rejected"|"config"} kind */
  constructor(kind, message, extra = {}) {
    super(message);
    this.name = "BuniError";
    this.kind = kind;
    Object.assign(this, extra);
  }
}

async function postJson(url, { headers, body }) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new BuniError(
        "timeout",
        `KCB did not answer within ${TIMEOUT_MS / 1000}s`,
      );
    }
    throw new BuniError("network", `Could not reach KCB: ${err.message}`);
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page */
  }
  return {
    status: res.status,
    json,
    text: json ? undefined : text.slice(0, 500),
  };
}

/* ======================================================
   TOKEN
   ====================================================== */

let cachedToken = null; // { value, expiresAt }

async function getToken() {
  if (
    cachedToken &&
    cachedToken.expiresAt - TOKEN_REFRESH_EARLY_MS > Date.now()
  ) {
    return cachedToken.value;
  }
  const key = process.env.KCB_CONSUMER_KEY;
  const secret = process.env.KCB_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new BuniError(
      "config",
      "KCB_CONSUMER_KEY / KCB_CONSUMER_SECRET are not set",
    );
  }

  const { status, json, text } = await postJson(tokenUrl(), {
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (status !== 200 || !json?.access_token) {
    logger.error("[KCB STK] Token request failed", {
      status,
      body: json ?? text,
    });
    throw new BuniError("auth", `KCB token request failed (HTTP ${status})`);
  }

  const ttlSeconds =
    Number(json.expires_in) > 0 ? Number(json.expires_in) : 3600;
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
  logger.info("[KCB STK] Token obtained", { expiresInSeconds: ttlSeconds });
  return cachedToken.value;
}

/* ======================================================
   STK PUSH
   ====================================================== */

/**
 * Send a PIN prompt.
 * @param {{ phone:string, amount:number, invoiceNumber:string, callbackUrl:string,
 *           description:string, messageId:string }} p
 * @returns {Promise<{ merchantRequestId:string|null, checkoutRequestId:string|null,
 *                     statusMessage:string, request:object, response:object }>}
 * @throws {BuniError}
 */
async function stkPush(p) {
  const body = {
    phoneNumber: p.phone,
    amount: String(p.amount),
    invoiceNumber: p.invoiceNumber,
    sharedShortCode: true,
    orgShortCode: "",
    orgPassKey: "",
    callbackUrl: p.callbackUrl,
    transactionDescription: p.description,
  };
  // Logged copy: no phone, no callback token.
  const logged = {
    ...body,
    phoneNumber: maskPhone(body.phoneNumber),
    callbackUrl: "[redacted]",
  };

  if (isMock()) return mockStkPush(p, body, logged);

  const token = await getToken();
  const { status, json, text } = await postJson(stkUrl(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // From the Buni Postman collection (plan §6 Q3: confirm with KCB).
      routeCode: "207",
      operation: "STKPush",
      messageId: p.messageId,
    },
    body,
  });

  if (status === 401) cachedToken = null; // force a new token next time

  const header = json?.header ?? {};
  const response = json?.response ?? {};
  const accepted = status === 200 && String(header.statusCode) === "0";

  logger.info("[KCB STK] Push request", {
    request: logged,
    httpStatus: status,
    statusCode: header.statusCode,
    statusMessage: header.statusDescription ?? header.statusMessage,
    merchantRequestId: response.MerchantRequestID,
  });

  if (!accepted) {
    throw new BuniError(
      status === 401 ? "auth" : "rejected",
      header.statusDescription ||
        header.statusMessage ||
        response.ResponseDescription ||
        `KCB rejected the request (HTTP ${status})`,
      { httpStatus: status, response: json ?? text },
    );
  }

  // The spec shows CheckoutRequestID as both `false` and "ws_CO_…".
  const checkout = response.CheckoutRequestID;
  return {
    merchantRequestId: response.MerchantRequestID
      ? String(response.MerchantRequestID)
      : null,
    checkoutRequestId:
      typeof checkout === "string" && checkout ? checkout : null,
    statusMessage:
      header.statusDescription || header.statusMessage || "Accepted",
    request: logged,
    response: json,
  };
}

/* ======================================================
   MOCK (development only)
   ====================================================== */

/**
 * Pretends to be KCB: accepts the request, then posts a callback to this API
 * after KCB_STK_MOCK_DELAY_MS (default 4000). The phone's last 4 digits pick
 * the outcome, so every path can be tried from the POS:
 *   …1032 cancelled · …1037 unreachable · …2001 wrong PIN · …9999 no callback
 *   anything else: paid
 */
function mockStkPush(p, body, logged) {
  const merchantRequestId = `MOCK-${crypto.randomUUID()}`;
  const checkoutRequestId = `ws_CO_MOCK_${Date.now()}`;
  const last4 = p.phone.slice(-4);
  const resultCode = { 1032: 1032, 1037: 1037, 2001: 2001 }[last4] ?? 0;
  const delay = Number(process.env.KCB_STK_MOCK_DELAY_MS) || 4000;

  logger.info("[KCB STK] MOCK push request (no call to KCB)", {
    request: logged,
    resultCode,
  });

  if (last4 !== "9999") {
    const token = new URL(p.callbackUrl).pathname
      .split("/")
      .filter(Boolean)
      .pop();
    const localUrl = `http://127.0.0.1:${process.env.PORT || 8000}/kcb/stk/${token}`;
    const callback = buildMockCallback({
      merchantRequestId,
      checkoutRequestId,
      resultCode,
      phone: p.phone,
      amount: p.amount,
    });
    setTimeout(() => {
      fetch(localUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(callback),
      }).catch((err) =>
        logger.error("[KCB STK] MOCK callback failed", { error: err.message }),
      );
    }, delay).unref?.();
  }

  return Promise.resolve({
    merchantRequestId,
    checkoutRequestId,
    statusMessage: "Success. Request accepted for processing (mock)",
    request: logged,
    response: {
      header: { statusCode: "0", statusDescription: "Mock accepted" },
      response: {
        MerchantRequestID: merchantRequestId,
        CheckoutRequestID: checkoutRequestId,
      },
    },
  });
}

function eatStamp(d = new Date()) {
  return new Date(d.getTime() + 3 * 3600e3)
    .toISOString()
    .slice(0, 19)
    .replace(/[-T:]/g, "");
}

function buildMockCallback({
  merchantRequestId,
  checkoutRequestId,
  resultCode,
  phone,
  amount,
}) {
  const desc = {
    0: "The service request is processed successfully.",
    1032: "Request cancelled by user",
    1037: "DS timeout user cannot be reached",
    2001: "The initiator information is invalid.",
  }[resultCode];
  const stkCallback = {
    MerchantRequestID: merchantRequestId,
    CheckoutRequestID: checkoutRequestId,
    ResultCode: resultCode,
    ResultDesc: desc,
  };
  if (resultCode === 0) {
    stkCallback.CallbackMetadata = {
      Item: [
        { Name: "Amount", Value: Number(amount) },
        {
          Name: "MpesaReceiptNumber",
          Value: `MK${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
        },
        { Name: "TransactionDate", Value: Number(eatStamp()) },
        { Name: "PhoneNumber", Value: Number(phone) },
      ],
    };
  }
  return { Body: { stkCallback } };
}

module.exports = {
  stkPush,
  BuniError,
  isMock,
  _internal: {
    buildMockCallback,
    tokenUrl,
    stkUrl,
    resetToken: () => (cachedToken = null),
  },
};
