const request = require("supertest");
const app = require("../../../tests/testApp");

jest.mock("../payments.service");

const paymentsService = require("../payments.service");

describe("Payments API", () => {
  afterEach(() => jest.clearAllMocks());

  /* ===============================
     PROCESS PAYMENT
     =============================== */

  it("POST /payments", async () => {
    paymentsService.processPayments.mockResolvedValue({
      payment_id: "pay-1",
    });

    const res = await request(app).post("/payments").send({
      billId: "bill-1",
      amount: 1000,
      paymentType: "cash",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment_id).toBe("pay-1");
  });

  /* ===============================
     LIST PAYMENTS
     =============================== */

  it("GET /payments", async () => {
    paymentsService.listPayments.mockResolvedValue([]);

    const res = await request(app).get("/payments").query({ type: "cash" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  /* ===============================
     BILLS WITH PAYMENTS
     =============================== */

  it("GET /payments/bills", async () => {
    paymentsService.fetchBillsWithPayments.mockResolvedValue([]);

    const res = await request(app).get("/payments/bills");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
