jest.mock("../mpesa.repository", () => ({
  listTransactions: jest.fn(),
  getTransaction: jest.fn(),
  listAllocations: jest.fn(),
  listPayableBills: jest.fn(),
  getPayableBill: jest.fn(),
  allocate: jest.fn(),
  reverseAllocation: jest.fn(),
  listStaff: jest.fn(),
  billHasActiveAllocations: jest.fn(),
}));
jest.mock("../../audit/audit.repository", () => ({ log: jest.fn() }));

const repo = require("../mpesa.repository");
const auditRepo = require("../../audit/audit.repository");
const service = require("../mpesa.service");
const { maskMsisdn, scoreMatch, normalizeMsisdn, searchTerms } = service._internal;

describe("mobile search normalisation", () => {
  it.each([
    ["0712345678", "254712345678"],
    ["0712 345 678", "254712345678"],
    ["712345678", "254712345678"],
    ["+254712345678", "254712345678"],
    ["254712345678", "254712345678"],
    ["0712", "254712"],
    ["0110 123", "254110123"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeMsisdn(input)).toBe(expected);
  });

  it.each(["PETER", "FT25139M3RM6", "07", "", null])("ignores non-phone %p", (input) => {
    expect(normalizeMsisdn(input)).toBeNull();
  });

  it("passes text and phone variants to the repository", () => {
    expect(searchTerms(" 0712 ")).toEqual({ q: "0712", phone: "254712" });
    expect(searchTerms("Peter Bor")).toEqual({ q: "Peter Bor", phone: undefined });
    expect(searchTerms("   ")).toEqual({});
  });
});

const TXN_ID = "11111111-1111-4111-8111-111111111111";
const BILL_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BILL_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const STAFF = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const cashier = { userId: "user-1", role: "waitress", permissions: ["pos_access", "allocate_mpesa"] };
const manager = { userId: "user-2", role: "manager", permissions: ["allocate_mpesa", "manage_mpesa"] };

const txnRow = (over = {}) => ({
  id: TXN_ID,
  transaction_id: "FT26321ABCDE",
  amount: "1500.00",
  allocated_amount: "0.00",
  status: "unallocated",
  msisdn: "254711000441",
  first_name: "PETER",
  middle_name: null,
  last_name: "BOR",
  bill_reference: null,
  transaction_type: "MPESA",
  transaction_at: new Date("2026-11-17T20:00:00Z"),
  received_at: new Date("2026-11-17T20:00:02Z"),
  deposit_label: null,
  deposit_marked_at: null,
  ...over,
});

beforeEach(() => jest.clearAllMocks());

/* ======================================================
   PRESENTATION
   ====================================================== */

describe("phone masking", () => {
  it("masks the middle digits", () => {
    expect(maskMsisdn("254711000441")).toBe("2547****441");
    expect(maskMsisdn(null)).toBeNull();
    expect(maskMsisdn("12345")).toBe("****");
  });

  it("shows the full number only to managers", async () => {
    repo.listTransactions.mockResolvedValue([txnRow()]);

    const [forCashier] = await service.listTransactions({}, cashier);
    const [forManager] = await service.listTransactions({}, manager);

    expect(forCashier.phone).toBe("2547****441");
    expect(forManager.phone).toBe("254711000441");
    expect(forCashier).toMatchObject({ amount: 1500, remaining: 1500, payerName: "PETER BOR" });
  });
});

/* ======================================================
   MATCHING
   ====================================================== */

describe("scoreMatch", () => {
  const txn = {
    remaining: 1500,
    billReference: "table 4",
    depositLabel: null,
    payerName: "PETER BOR",
    transactionAt: "2026-11-17T20:00:00Z",
  };

  it("ranks the bill whose invoice number the customer typed first", () => {
    const paid = { ...txn, billReference: "fwz1sw" };
    const byInvoice = scoreMatch(paid, { customer_name: "John", invoice_number: "FWZ1SW", payable_amount: "3000", updated_at: "2026-11-16T10:00:00Z" });
    const byAmount = scoreMatch(paid, { customer_name: "Table 4", invoice_number: "FWJTNQ", payable_amount: "1500", updated_at: "2026-11-17T19:30:00Z" });
    expect(byInvoice.reasons).toContain("invoice number matches");
    expect(byInvoice.score).toBeGreaterThan(byAmount.score);
  });

  it("finds the invoice number in the receipt's paybill account (8040662#FWxxxx)", () => {
    const paid = { ...txn, billReference: "8040662#FWZ1SW" };
    const res = scoreMatch(paid, { customer_name: "John", invoice_number: "FWZ1SW", payable_amount: "3000", updated_at: "2026-11-16T10:00:00Z" });
    expect(res.reasons).toContain("invoice number matches");
  });

  it("finds the invoice number typed without the '#' (8040662FWxxxx) but not inside other words", () => {
    const bill = { customer_name: "John", invoice_number: "FWZ1SW", payable_amount: "3000", updated_at: "2026-11-16T10:00:00Z" };
    expect(scoreMatch({ ...txn, billReference: "8040662FWZ1SW" }, bill).reasons).toContain("invoice number matches");
    expect(scoreMatch({ ...txn, billReference: "ABCFWZ1SW" }, bill).reasons).not.toContain("invoice number matches");
  });

  it("ranks exact amount + reference highest", () => {
    const exact = scoreMatch(txn, { customer_name: "Table 4", payable_amount: "1500", updated_at: "2026-11-17T19:30:00Z" });
    const amountOnly = scoreMatch(txn, { customer_name: "John", payable_amount: "1500", updated_at: "2026-11-17T19:30:00Z" });
    const none = scoreMatch(txn, { customer_name: "John", payable_amount: "3000", updated_at: "2026-11-16T10:00:00Z" });

    expect(exact.reasons).toEqual(expect.arrayContaining(["exact amount", "reference matches bill"]));
    expect(exact.score).toBeGreaterThan(amountOnly.score);
    expect(amountOnly.score).toBeGreaterThan(none.score);
    expect(none.score).toBe(0);
  });

  it("matches on payer name", () => {
    const res = scoreMatch(txn, { customer_name: "Peter VIP", payable_amount: "900", updated_at: "2026-11-10T00:00:00Z" });
    expect(res.reasons).toEqual(["covers balance", "payer name matches"]);
  });
});

describe("listTransactions with billId", () => {
  it("orders by match score for the bill", async () => {
    repo.listTransactions.mockResolvedValue([
      txnRow({ id: "t-other", amount: "700.00", first_name: "JANE", last_name: null }),
      txnRow({ id: "t-exact", amount: "1500.00" }),
    ]);
    repo.getPayableBill.mockResolvedValue({
      id: BILL_A, customer_name: "Peter", payable_amount: "1500", updated_at: "2026-11-17T19:50:00Z",
    });

    const list = await service.listTransactions({ billId: BILL_A }, cashier);

    expect(list.map((t) => t.id)).toEqual(["t-exact", "t-other"]);
    expect(list[0].match.reasons).toContain("exact amount");
  });

  it("rejects an unknown status filter", async () => {
    await expect(service.listTransactions({ status: "weird" }, cashier)).rejects.toThrow("MPESA_INVALID_FILTER");
  });
});

/* ======================================================
   ALLOCATE
   ====================================================== */

describe("allocate", () => {
  it("passes normalised lines and deposit label to the database", async () => {
    repo.allocate.mockResolvedValue({ receipt: "FT26321ABCDE", remaining: 200 });

    await service.allocate(
      TXN_ID,
      {
        lines: [
          { type: "bill", billId: BILL_A, amount: "1000.004" },
          { type: "tip", billId: BILL_A, recipientId: STAFF, amount: 300 },
        ],
        depositLabel: "  Peter - later  ",
      },
      cashier,
    );

    expect(repo.allocate).toHaveBeenCalledWith({
      txnId: TXN_ID,
      userId: "user-1",
      depositLabel: "Peter - later",
      lines: [
        { type: "bill", bill_id: BILL_A, amount: 1000 },
        { type: "tip", bill_id: BILL_A, recipient_id: STAFF, amount: 300 },
      ],
    });
    expect(auditRepo.log).toHaveBeenCalledWith(expect.objectContaining({ action: "MPESA_ALLOCATED" }));
  });

  it("allows only a deposit label (no lines)", async () => {
    repo.allocate.mockResolvedValue({});
    await service.allocate(TXN_ID, { lines: [], depositLabel: "Mary" }, cashier);
    expect(repo.allocate).toHaveBeenCalledWith(expect.objectContaining({ lines: [], depositLabel: "Mary" }));
  });

  it.each([
    [{ lines: [] }, "MPESA_INVALID_ALLOCATION"],
    [{ lines: "x" }, "MPESA_INVALID_ALLOCATION"],
    [{ lines: [{ type: "bill", amount: 100 }] }, "MPESA_INVALID_ALLOCATION"],
    [{ lines: [{ type: "bill", billId: BILL_A, amount: 0 }] }, "MPESA_INVALID_ALLOCATION"],
    [{ lines: [{ type: "refund", amount: 10 }] }, "MPESA_INVALID_ALLOCATION"],
    [{ lines: [{ type: "bill", billId: "nope", amount: 10 }] }, "MPESA_BILL_NOT_FOUND"],
    [{ lines: [{ type: "tip", amount: 50 }] }, "MPESA_INVALID_ALLOCATION"],
    [{ lines: [{ type: "tip", recipientId: "nope", amount: 50 }] }, "MPESA_TIP_RECIPIENT_NOT_FOUND"],
    [
      { lines: [{ type: "bill", billId: BILL_A, amount: 10 }, { type: "bill", billId: BILL_A, amount: 5 }] },
      "MPESA_INVALID_ALLOCATION",
    ],
  ])("rejects bad input %#", async (body, code) => {
    await expect(service.allocate(TXN_ID, body, cashier)).rejects.toThrow(code);
    expect(repo.allocate).not.toHaveBeenCalled();
  });

  it("maps database rule violations to domain errors with detail", async () => {
    const pgErr = Object.assign(new Error("MPESA_OVER_ALLOCATED"), { detail: "allocating 2000 but only 1500 remains" });
    repo.allocate.mockRejectedValue(pgErr);

    const err = await service
      .allocate(TXN_ID, { lines: [{ type: "bill", billId: BILL_B, amount: 2000 }] }, cashier)
      .catch((e) => e);

    expect(err.message).toBe("MPESA_OVER_ALLOCATED");
    expect(err.details).toEqual(["allocating 2000 but only 1500 remains"]);
  });

  it("passes through unexpected database errors", async () => {
    repo.allocate.mockRejectedValue(new Error("connection reset"));
    await expect(
      service.allocate(TXN_ID, { lines: [{ type: "bill", billId: BILL_B, amount: 5 }] }, cashier),
    ).rejects.toThrow("connection reset");
  });
});

/* ======================================================
   REVERSE
   ====================================================== */

describe("reverseAllocation", () => {
  it("requires a reason", async () => {
    await expect(service.reverseAllocation(TXN_ID, { reason: " " }, manager)).rejects.toThrow(
      "MPESA_REVERSAL_REASON_REQUIRED",
    );
  });

  it("reverses and audits", async () => {
    repo.reverseAllocation.mockResolvedValue({ amount: 1000, bill_status: "open" });
    const res = await service.reverseAllocation(TXN_ID, { reason: "wrong table" }, manager);
    expect(res.bill_status).toBe("open");
    expect(repo.reverseAllocation).toHaveBeenCalledWith({ allocationId: TXN_ID, userId: "user-2", reason: "wrong table" });
    expect(auditRepo.log).toHaveBeenCalledWith(expect.objectContaining({ action: "MPESA_ALLOCATION_REVERSED" }));
  });
});
