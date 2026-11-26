const express = require("express");
const request = require("supertest");

jest.mock("../stk.repository", () => ({
  getRequest: jest.fn(),
  getByTokenHash: jest.fn(),
  listForBill: jest.fn(),
  getBillPromptState: jest.fn(),
  createRequest: jest.fn(),
  markSent: jest.fn(),
  markRequestFailed: jest.fn(),
  markUnconfirmed: jest.fn(),
  applyCallback: jest.fn(),
  linkIpn: jest.fn(),
  expireStale: jest.fn(),
}));
jest.mock("../mpesa.repository", () => ({ getPayableBill: jest.fn() }));
jest.mock("../../integrations/buni.client", () => {
  class BuniError extends Error {
    constructor(kind, message) {
      super(message);
      this.kind = kind;
    }
  }
  return { stkPush: jest.fn(), isMock: jest.fn(() => false), BuniError };
});
jest.mock("../../audit/audit.repository", () => ({ log: jest.fn() }));
jest.mock("../../../utils/logger", () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const repo = require("../stk.repository");
const mpesaRepo = require("../mpesa.repository");
const buni = require("../../integrations/buni.client");
const service = require("../stk.service");
const { _internal } = service;

const BILL = "11111111-1111-4111-8111-111111111111";
const REQ = "22222222-2222-4222-8222-222222222222";
const USER = "33333333-3333-4333-8333-333333333333";
const ctx = { userId: USER, role: "bartender", permissions: ["allocate_mpesa"] };

const ENV = {
  KCB_STK_ENABLED: "true",
  KCB_STK_TILL_NUMBER: "5123456",
  KCB_STK_CALLBACK_BASE: "https://api.fairywren.co.ke/kcb/stk/",
  KCB_CONSUMER_KEY: "key",
  KCB_CONSUMER_SECRET: "secret",
};

const requestRow = (over = {}) => ({
  id: REQ,
  bill_id: BILL,
  requested_by: USER,
  phone: "254712345678",
  amount: "1500.00",
  account_ref: "FWZ1SW",
  status: "waiting",
  result_code: null,
  result_desc: null,
  created_at: new Date("2026-11-26T10:00:00Z"),
  updated_at: new Date("2026-11-26T10:00:00Z"),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(process.env, ENV);
  delete process.env.KCB_STK_INVOICE_SEPARATOR;
  mpesaRepo.getPayableBill.mockResolvedValue({ id: BILL, status: "open", payable_amount: "2000.00" });
  repo.getBillPromptState.mockResolvedValue({ seconds_since_last: null, active: false });
  repo.createRequest.mockResolvedValue({ id: REQ, account_ref: "FWZ1SW" });
  repo.getRequest.mockResolvedValue(requestRow());
  buni.stkPush.mockResolvedValue({ merchantRequestId: "m-1", checkoutRequestId: "ws_CO_1", statusMessage: "ok" });
});

afterAll(() => {
  for (const k of Object.keys(ENV)) delete process.env[k];
});

/* ======================================================
   HELPERS
   ====================================================== */

describe("normalizeStkPhone", () => {
  const n = _internal.normalizeStkPhone;
  it.each([
    ["0712345678", "254712345678"],
    ["0712 345 678", "254712345678"],
    ["712345678", "254712345678"],
    ["+254712345678", "254712345678"],
    ["0112345678", "254112345678"],
    ["254112345678", "254112345678"],
  ])("%s → %s", (input, out) => expect(n(input)).toBe(out));

  it.each(["", "0812345678", "07123", "071234567890", "abc", null, "0712-34x678"])(
    "rejects %p",
    (input) => expect(n(input)).toBeNull(),
  );
});

describe("callback token", () => {
  it("is 12 base62 characters and fits KCB's 50-character callbackUrl", () => {
    const t = _internal.newCallbackToken();
    expect(t).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(`https://api.fairywren.co.ke/kcb/stk/${t}`.length).toBeLessThanOrEqual(50);
  });
  it("shortens to fit a longer callback base, down to 10 characters", () => {
    expect(_internal.tokenLength("https://api.fairywren.co.ke/kcb/stk")).toBe(12); // 35 + 1 + 12 = 48
    expect(_internal.tokenLength("https://api.fairywren.co.ke/kcb/qa")).toBe(12); // 34 + 1 + 12 = 47
    expect(_internal.tokenLength("https://api.fairywren.co.ke/kcb/qa-test")).toBe(10); // 39 + 1 + 10 = 50
    expect(_internal.newCallbackToken(11)).toMatch(/^[A-Za-z0-9]{11}$/);
  });
  it("accepts the QA base, rejects one that leaves under 10 characters", () => {
    process.env.KCB_STK_CALLBACK_BASE = "https://api.fairywren.co.ke/kcb/qa/";
    expect(_internal.configProblems()).toEqual([]);
    process.env.KCB_STK_CALLBACK_BASE = "https://api.fairywren.co.ke/kcb/qa-testing";
    expect(_internal.configProblems().join()).toMatch(/50/);
  });
  it("hashes to sha256 hex", () => {
    expect(_internal.hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("configProblems", () => {
  it("is empty when everything is set", () => {
    expect(_internal.configProblems()).toEqual([]);
  });
  it("rejects a callback base that would exceed 50 characters", () => {
    process.env.KCB_STK_CALLBACK_BASE = "https://api.some-very-long-domain-name.co.ke/kcb/stk/";
    expect(_internal.configProblems().join()).toMatch(/50/);
  });
  it("requires https and credentials", () => {
    process.env.KCB_STK_CALLBACK_BASE = "http://api.fairywren.co.ke/kcb/stk/";
    delete process.env.KCB_CONSUMER_KEY;
    const p = _internal.configProblems().join(";");
    expect(p).toMatch(/https/);
    expect(p).toMatch(/CONSUMER_KEY/);
  });
});

/* ======================================================
   INITIATE
   ====================================================== */

describe("initiate", () => {
  const send = (over = {}) =>
    service.initiate({ billId: BILL, phone: "0712 345 678", amount: 1500, ...over }, ctx);

  it("creates the prompt and sends it to KCB with our reference", async () => {
    const dto = await send();

    expect(repo.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({ billId: BILL, userId: USER, phone: "254712345678", amount: 1500 }),
    );
    const tokenHash = repo.createRequest.mock.calls[0][0].tokenHash;
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);

    const push = buni.stkPush.mock.calls[0][0];
    expect(push).toMatchObject({ phone: "254712345678", amount: 1500, invoiceNumber: "5123456-FWZ1SW" });
    const token = push.callbackUrl.split("/").pop();
    expect(push.callbackUrl).toBe(`https://api.fairywren.co.ke/kcb/stk/${token}`);
    expect(_internal.hashToken(token)).toBe(tokenHash); // only the hash is stored

    expect(repo.markSent).toHaveBeenCalledWith(REQ, expect.objectContaining({ merchantRequestId: "m-1" }));
    expect(dto).toMatchObject({ id: REQ, accountRef: "FWZ1SW", status: "waiting", active: true });
    expect(dto.phone).toBe("254712345678"); // the cashier who sent it sees the number
  });

  it("appends the token to the QA callback address", async () => {
    process.env.KCB_STK_CALLBACK_BASE = "https://api.fairywren.co.ke/kcb/qa/";
    await send();
    const url = buni.stkPush.mock.calls[0][0].callbackUrl;
    expect(url).toMatch(/^https:\/\/api\.fairywren\.co\.ke\/kcb\/qa\/[A-Za-z0-9]{12}$/);
    expect(url.length).toBe(47);
  });

  it("uses the configured invoice separator", async () => {
    process.env.KCB_STK_INVOICE_SEPARATOR = "#";
    await send();
    expect(buni.stkPush.mock.calls[0][0].invoiceNumber).toBe("5123456#FWZ1SW");
  });

  it("is refused when switched off", async () => {
    process.env.KCB_STK_ENABLED = "false";
    await expect(send()).rejects.toThrow("MPESA_STK_DISABLED");
    expect(repo.createRequest).not.toHaveBeenCalled();
  });

  it.each([
    [{ phone: "0812345678" }, "MPESA_STK_INVALID_PHONE"],
    [{ amount: 10.5 }, "MPESA_STK_INVALID_AMOUNT"],
    [{ amount: 0 }, "MPESA_STK_INVALID_AMOUNT"],
    [{ amount: 250001 }, "MPESA_STK_INVALID_AMOUNT"],
    [{ billId: "nope" }, "MPESA_BILL_NOT_FOUND"],
    [{ amount: 2001 }, "MPESA_EXCEEDS_BILL_BALANCE"],
  ])("validates %p", async (over, code) => {
    await expect(send(over)).rejects.toThrow(code);
    expect(buni.stkPush).not.toHaveBeenCalled();
  });

  it("refuses a closed bill", async () => {
    mpesaRepo.getPayableBill.mockResolvedValue({ id: BILL, status: "completed", payable_amount: "0" });
    await expect(send()).rejects.toThrow("MPESA_BILL_NOT_PAYABLE");
  });

  it("allows one active prompt per bill and a 20 s gap between prompts", async () => {
    repo.getBillPromptState.mockResolvedValue({ seconds_since_last: 5, active: true });
    await expect(send()).rejects.toThrow("MPESA_STK_ALREADY_ACTIVE");

    repo.getBillPromptState.mockResolvedValue({ seconds_since_last: 5, active: false });
    await expect(send()).rejects.toThrow("MPESA_STK_TOO_SOON");

    repo.getBillPromptState.mockResolvedValue({ seconds_since_last: 21, active: false });
    await expect(send()).resolves.toBeDefined();
  });

  it("maps a race on the one-active-prompt index", async () => {
    repo.createRequest.mockRejectedValue(
      Object.assign(new Error("dup"), { code: "23505", constraint: "uq_mpesa_stk_one_active_per_bill" }),
    );
    await expect(send()).rejects.toThrow("MPESA_STK_ALREADY_ACTIVE");
  });

  it("marks the prompt failed when KCB rejects it", async () => {
    buni.stkPush.mockRejectedValue(new buni.BuniError("rejected", "Invalid phone"));
    await expect(send()).rejects.toThrow("MPESA_STK_REQUEST_FAILED");
    expect(repo.markRequestFailed).toHaveBeenCalledWith(REQ, expect.objectContaining({ desc: "Invalid phone" }));
  });

  it("keeps waiting when KCB times out (the prompt may still have been sent)", async () => {
    buni.stkPush.mockRejectedValue(new buni.BuniError("timeout", "slow"));
    await expect(send()).resolves.toMatchObject({ id: REQ });
    expect(repo.markUnconfirmed).toHaveBeenCalledWith(REQ, expect.any(String));
    expect(repo.markRequestFailed).not.toHaveBeenCalled();
  });
});

/* ======================================================
   PRESENTATION
   ====================================================== */

describe("toDto", () => {
  it("masks the phone for other cashiers", () => {
    const dto = _internal.toDto(requestRow({ requested_by: "someone-else" }), ctx);
    expect(dto.phone).toBe("2547****678");
  });
  it("shows the phone to managers", () => {
    const dto = _internal.toDto(requestRow({ requested_by: "someone-else" }), {
      ...ctx,
      permissions: ["manage_mpesa"],
    });
    expect(dto.phone).toBe("254712345678");
  });
  it.each([
    [{ status: "cancelled" }, /Cancelled/],
    [{ status: "failed", result_code: 2001 }, /Wrong M-Pesa PIN/],
    [{ status: "no_response", result_code: 1037 }, /could not be reached/],
    [{ status: "no_response" }, /No response/],
    [{ status: "paid" }, /^Paid$/],
  ])("status text %p", (over, re) => {
    expect(_internal.toDto(requestRow(over), ctx).statusText).toMatch(re);
  });
  it("expires 3 minutes after creation", () => {
    expect(_internal.toDto(requestRow(), ctx).expiresAt).toBe("2026-11-26T10:03:00.000Z");
  });
});

/* ======================================================
   CALLBACK ROUTE
   ====================================================== */

describe("POST /kcb/stk/:token", () => {
  const app = express();
  app.use(express.json());
  app.use("/kcb", require("../../integrations/kcb.stk.routes"));

  const TOKEN = "Ab3dE6gH9jK2";
  const success = {
    Body: {
      stkCallback: {
        MerchantRequestID: "m-1",
        CheckoutRequestID: "ws_CO_1",
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 1500 },
            { Name: "MpesaReceiptNumber", Value: "TKQ12ABC34" },
            { Name: "TransactionDate", Value: 20261126131502 },
            { Name: "PhoneNumber", Value: 254712345678 },
          ],
        },
      },
    },
  };

  beforeEach(() => {
    repo.getByTokenHash.mockResolvedValue({ id: REQ });
    repo.applyCallback.mockResolvedValue({ applied: true, status: "paid" });
  });

  it("applies a success callback found by the hashed token", async () => {
    const res = await request(app).post(`/kcb/stk/${TOKEN}`).send(success);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ResultCode: 0, ResultDesc: "Accepted" });
    expect(repo.getByTokenHash).toHaveBeenCalledWith(_internal.hashToken(TOKEN));
    expect(repo.applyCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: REQ,
        merchantRequestId: "m-1",
        resultCode: 0,
        receipt: "TKQ12ABC34",
        amount: 1500,
        phone: "254712345678",
        paidAt: new Date("2026-11-26T10:15:02Z"), // EAT → UTC
      }),
    );
  });

  it("passes a cancelled result without metadata", async () => {
    const body = { Body: { stkCallback: { MerchantRequestID: "m-1", ResultCode: 1032, ResultDesc: "Request cancelled by user" } } };
    await request(app).post(`/kcb/stk/${TOKEN}`).send(body).expect(200);
    expect(repo.applyCallback).toHaveBeenCalledWith(
      expect.objectContaining({ resultCode: 1032, receipt: null, amount: null }),
    );
  });

  it.each([
    ["an unknown token", "Zz9Zz9Zz9Zz9", success, () => repo.getByTokenHash.mockResolvedValue(null)],
    ["a malformed token", "short", success, () => {}],
    ["a body without stkCallback", TOKEN, { hello: 1 }, () => {}],
  ])("ignores %s but still answers 200", async (_label, token, body, setup) => {
    setup();
    const res = await request(app).post(`/kcb/stk/${token}`).send(body);
    expect(res.status).toBe(200);
    expect(repo.applyCallback).not.toHaveBeenCalled();
  });

  it("answers 500 on a database failure so KCB retries", async () => {
    repo.applyCallback.mockRejectedValue(new Error("connection refused"));
    const res = await request(app).post(`/kcb/stk/${TOKEN}`).send(success);
    expect(res.status).toBe(500);
  });
});
