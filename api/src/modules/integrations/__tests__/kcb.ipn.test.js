const crypto = require("crypto");
const express = require("express");
const request = require("supertest");

jest.mock("../kcb.repository", () => ({
  insertTransactionIdempotent: jest.fn(),
  postReceiptJournal: jest.fn(),
}));
jest.mock("../../audit/audit.repository", () => ({ log: jest.fn() }));
jest.mock("../../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const repo = require("../kcb.repository");
const { verifySignature, _resetKeyCache } = require("../kcb.signature");
const { _internal } = require("../kcb.service");
const { saveRawBody } = require("../../../utils/rawBody");
const kcbRoutes = require("../kcb.routes");

/* ======================================================
   FIXTURES
   ====================================================== */

let privateKey;
let otherPrivateKey;

const sign = (data, key = privateKey) =>
  crypto.sign("sha256", Buffer.from(data), key).toString("base64");

const tillPayload = (overrides = {}) => ({
  header: {
    messageID: "msg-1",
    originatorConversationID: "conv-1",
    channelCode: "202",
    timeStamp: "20261117213045",
  },
  requestPayload: {
    primaryData: { businessKey: "1234567", businessKeyType: "notifyBiller" },
    additionalData: {
      notificationData: {
        businessKey: "TABLE 4",
        businessKeyType: "BillReferenceNumber",
        debitMSISDN: "254711000000",
        transactionAmt: "1500.00",
        transactionDate: "Mon Nov 17 21:30:44 EAT 2026",
        transactionID: "FT26321ABCDE",
        firstName: "PETER",
        middleName: "",
        lastName: "BOR",
        currency: "KES",
        narration: "",
        transactionType: "MPESA",
        balance: "0",
        ...overrides,
      },
    },
  },
});

const buildApp = () => {
  const app = express();
  app.use(express.json({ verify: saveRawBody }));
  app.use("/integrations/kcb", kcbRoutes);
  return app;
};

/** Send exact bytes so the signature covers what the server receives. */
const postSigned = (app, payload, { signature, raw } = {}) => {
  const body = raw ?? JSON.stringify(payload, null, 2); // pretty-printed, like a real client might
  const req = request(app)
    .post("/integrations/kcb/ipn/till")
    .set("Content-Type", "application/json");
  const sig = signature === undefined ? sign(body) : signature;
  if (sig !== null) req.set("Signature", sig);
  return req.send(body);
};

beforeAll(() => {
  const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  privateKey = pair.privateKey;
  otherPrivateKey = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  process.env.KCB_IPN_PUBLIC_KEY = pair.publicKey.export({ type: "spki", format: "pem" });
}, 20000);

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.KCB_IPN_VERIFY_SIGNATURE;
  process.env.KCB_IPN_POST_RECEIPT_JOURNAL = "true"; // most tests cover the go-live setting
  _resetKeyCache();
  repo.insertTransactionIdempotent.mockResolvedValue({ id: "txn-uuid-1", inserted: true });
  repo.postReceiptJournal.mockResolvedValue("journal-1");
});

afterAll(() => {
  delete process.env.KCB_IPN_PUBLIC_KEY;
  delete process.env.KCB_IPN_POST_RECEIPT_JOURNAL;
});

/* ======================================================
   SIGNATURE
   ====================================================== */

describe("kcb.signature", () => {
  const body = JSON.stringify({ a: 1, b: "x" });

  it("accepts a signature over the raw bytes", () => {
    const res = verifySignature({ rawBody: Buffer.from(body), body: JSON.parse(body), signature: sign(body) });
    expect(res).toEqual({ valid: true, matchedOn: "raw" });
  });

  it("falls back to the re-serialised JSON body", () => {
    const pretty = JSON.stringify(JSON.parse(body), null, 2);
    const res = verifySignature({ rawBody: Buffer.from(pretty), body: JSON.parse(body), signature: sign(body) });
    expect(res).toEqual({ valid: true, matchedOn: "json" });
  });

  it("rejects a tampered body", () => {
    const tampered = body.replace("1", "2");
    const res = verifySignature({ rawBody: Buffer.from(tampered), body: JSON.parse(tampered), signature: sign(body) });
    expect(res.valid).toBe(false);
  });

  it("rejects a signature from another key", () => {
    const res = verifySignature({ rawBody: Buffer.from(body), body: JSON.parse(body), signature: sign(body, otherPrivateKey) });
    expect(res.valid).toBe(false);
  });

  it("rejects a missing or garbage signature", () => {
    expect(verifySignature({ rawBody: Buffer.from(body), signature: undefined }).reason).toBe("MISSING_SIGNATURE");
    expect(verifySignature({ rawBody: Buffer.from(body), signature: "not-base64!!" }).valid).toBe(false);
  });

  it("rejects everything when no public key is configured", () => {
    const saved = process.env.KCB_IPN_PUBLIC_KEY;
    delete process.env.KCB_IPN_PUBLIC_KEY;
    _resetKeyCache();
    const res = verifySignature({ rawBody: Buffer.from(body), signature: sign(body) });
    process.env.KCB_IPN_PUBLIC_KEY = saved;
    expect(res).toEqual({ valid: false, reason: "PUBLIC_KEY_NOT_CONFIGURED" });
  });

  it("cannot be disabled in production", () => {
    const savedEnv = process.env.NODE_ENV;
    process.env.KCB_IPN_VERIFY_SIGNATURE = "false";
    process.env.NODE_ENV = "production";
    const res = verifySignature({ rawBody: Buffer.from(body), signature: undefined });
    process.env.NODE_ENV = savedEnv;
    expect(res.valid).toBe(false);
  });
});

/* ======================================================
   PARSING
   ====================================================== */

describe("kcb.service parsing", () => {
  const { parseAmount, parseKcbTimestamp, parseTillNotification } = _internal;

  it("parses amounts", () => {
    expect(parseAmount("1000")).toBe(1000);
    expect(parseAmount("100.50")).toBe(100.5);
    expect(parseAmount("1,250.00")).toBe(1250);
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });

  it("parses the header timestamp as EAT", () => {
    expect(parseKcbTimestamp("20261117213045").toISOString()).toBe("2026-11-17T18:30:45.000Z");
    expect(parseKcbTimestamp("20201102")).toBeNull();
  });

  it("maps a till notification to a row", () => {
    const { row, errors } = parseTillNotification(tillPayload(), { signatureValid: true });
    expect(errors).toEqual([]);
    expect(row).toMatchObject({
      source: "kcb_till",
      transactionId: "FT26321ABCDE",
      messageId: "msg-1",
      businessKey: "1234567",
      billReference: "TABLE 4",
      msisdn: "254711000000",
      firstName: "PETER",
      middleName: null,
      lastName: "BOR",
      amount: 1500,
      currency: "KES",
      transactionType: "MPESA",
      transactionDateRaw: "Mon Nov 17 21:30:44 EAT 2026",
      signatureValid: true,
    });
    expect(row.transactionAt.toISOString()).toBe("2026-11-17T18:30:45.000Z");
  });

  it("falls back to received time when the header timestamp is unusable", () => {
    const payload = tillPayload();
    payload.header.timeStamp = "garbage";
    const receivedAt = new Date("2026-11-17T20:00:00Z");
    const { row } = parseTillNotification(payload, { signatureValid: true, receivedAt });
    expect(row.transactionAt).toBe(receivedAt);
  });

  it("reports missing mandatory fields", () => {
    const { row, errors } = parseTillNotification(
      tillPayload({ transactionID: "", transactionAmt: "0" }),
      { signatureValid: true },
    );
    expect(row).toBeUndefined();
    expect(errors).toHaveLength(2);
  });
});

/* ======================================================
   WEBHOOK
   ====================================================== */

describe("POST /integrations/kcb/ipn/till", () => {
  const app = buildApp();

  it("stores a signed notification and acks in KCB format", async () => {
    const res = await postSigned(app, tillPayload());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      header: {
        messageID: "msg-1",
        originatorConversationID: "conv-1",
        statusCode: "0",
        statusMessage: "Notification received successfully",
      },
      responsePayload: { transactionInfo: { transactionId: "txn-uuid-1" } },
    });
    expect(repo.insertTransactionIdempotent).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: "FT26321ABCDE", amount: 1500 }),
    );
    expect(repo.postReceiptJournal).toHaveBeenCalledWith("txn-uuid-1");
  });

  it("acks a duplicate delivery with the same id and no second journal", async () => {
    repo.insertTransactionIdempotent.mockResolvedValue({ id: "txn-uuid-1", inserted: false });

    const res = await postSigned(app, tillPayload());

    expect(res.status).toBe(200);
    expect(res.body.header.statusCode).toBe("0");
    expect(res.body.responsePayload.transactionInfo.transactionId).toBe("txn-uuid-1");
    expect(repo.postReceiptJournal).not.toHaveBeenCalled();
  });

  it("stores and acks but does not journal while the receipt journal is off (default)", async () => {
    delete process.env.KCB_IPN_POST_RECEIPT_JOURNAL;

    const res = await postSigned(app, tillPayload());

    expect(res.status).toBe(200);
    expect(res.body.header.statusCode).toBe("0");
    expect(repo.insertTransactionIdempotent).toHaveBeenCalled();
    expect(repo.postReceiptJournal).not.toHaveBeenCalled();
  });

  it("still acks when the receipt journal fails (notification is stored)", async () => {
    repo.postReceiptJournal.mockRejectedValue(new Error("period closed"));

    const res = await postSigned(app, tillPayload());

    expect(res.status).toBe(200);
    expect(res.body.header.statusCode).toBe("0");
  });

  it("rejects an unsigned request without storing it", async () => {
    const res = await postSigned(app, tillPayload(), { signature: null });

    expect(res.status).toBe(401);
    expect(res.body.header.statusCode).toBe("1");
    expect(res.body.header.messageID).toBe("msg-1");
    expect(repo.insertTransactionIdempotent).not.toHaveBeenCalled();
  });

  it("rejects a tampered amount", async () => {
    const original = JSON.stringify(tillPayload());
    const tampered = original.replace('"1500.00"', '"15000.00"');

    const res = await postSigned(app, null, { raw: tampered, signature: sign(original) });

    expect(res.status).toBe(401);
    expect(repo.insertTransactionIdempotent).not.toHaveBeenCalled();
  });

  it("rejects a signed but invalid payload", async () => {
    const res = await postSigned(app, tillPayload({ transactionAmt: "abc" }));

    expect(res.status).toBe(400);
    expect(res.body.header.statusCode).toBe("1");
    expect(repo.insertTransactionIdempotent).not.toHaveBeenCalled();
  });

  it("returns 500 so KCB retries when the database is down", async () => {
    repo.insertTransactionIdempotent.mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await postSigned(app, tillPayload());

    expect(res.status).toBe(500);
    expect(res.body.header.statusCode).toBe("1");
  });

  it("accepts unsigned requests only when verification is disabled outside production", async () => {
    process.env.KCB_IPN_VERIFY_SIGNATURE = "false";

    const res = await postSigned(app, tillPayload(), { signature: null });

    expect(res.status).toBe(200);
    expect(res.body.header.statusCode).toBe("0");
  });
});
