const paymentsService = require("../payments.service");
const commandRepo = require("../payments.command.repository");
const readRepo = require("../payments.read.repository");
const billsReadRepo = require("../payments.bills.read.repository");
const auditRepo = require("../../audit/audit.repository");

jest.mock("../payments.command.repository");
jest.mock("../payments.read.repository");
jest.mock("../payments.bills.read.repository");
jest.mock("../../audit/audit.repository");

describe("Payments Service", () => {
  afterEach(() => jest.clearAllMocks());

  /* ===============================
     PROCESS PAYMENT
     =============================== */

  it("processes payment successfully", async () => {
    commandRepo.processPayment.mockResolvedValue({
      data: { payment_id: "pay-1" },
      error: null,
    });

    auditRepo.log.mockResolvedValue();

    const result = await paymentsService.processPayments(
      {
        billId: "bill-1",
        amount: 1000,
        paymentMode: "cash",
      },
      {
        userId: "user-1",
        role: "cashier",
        correlationId: "corr-1",
      },
    );

    expect(commandRepo.processPayment).toHaveBeenCalled();
    expect(auditRepo.log).toHaveBeenCalled();
    expect(result.payment_id).toBe("pay-1");
  });

  it("throws error for invalid payment data", async () => {
    await expect(
      paymentsService.processPayments(
        { billId: "bill-1" },
        { userId: "u1", role: "cashier" },
      ),
    ).rejects.toThrow("INVALID_PAYMENT_DATA");
  });

  it("throws error when RPC fails", async () => {
    commandRepo.processPayment.mockResolvedValue({
      data: null,
      error: {},
    });

    await expect(
      paymentsService.processPayments(
        {
          billId: "bill-1",
          amount: 500,
          paymentMode: "cash",
        },
        {
          userId: "u1",
          role: "cashier",
        },
      ),
    ).rejects.toThrow("FAILED_TO_PROCESS_PAYMENT");
  });

  /* ===============================
     LIST PAYMENTS
     =============================== */

  it("lists payments with filters", async () => {
    readRepo.listPayments.mockResolvedValue({
      data: [{ id: "pay-1" }],
      error: null,
    });

    const result = await paymentsService.listPayments({
      type: "cash",
    });

    expect(readRepo.listPayments).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("throws error when listing payments fails", async () => {
    readRepo.listPayments.mockResolvedValue({
      data: null,
      error: {},
    });

    await expect(paymentsService.listPayments({})).rejects.toThrow(
      "FAILED_TO_FETCH_PAYMENTS",
    );
  });

  /* ===============================
     BILLS WITH PAYMENTS
     =============================== */

  it("fetches bills with payments", async () => {
    billsReadRepo.fetchBillsWithPayments.mockResolvedValue({
      data: [{ id: "bill-1" }],
      error: null,
    });

    const result = await paymentsService.fetchBillsWithPayments();

    expect(result).toHaveLength(1);
  });

  it("throws error when bills fetch fails", async () => {
    billsReadRepo.fetchBillsWithPayments.mockResolvedValue({
      data: null,
      error: {},
    });

    await expect(paymentsService.fetchBillsWithPayments()).rejects.toThrow(
      "FAILED_TO_FETCH_BILLS_WITH_PAYMENTS",
    );
  });
});
