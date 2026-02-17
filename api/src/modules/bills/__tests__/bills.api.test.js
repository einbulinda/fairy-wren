const request = require("supertest");
const app = require("../../../tests/testApp");
const service = require("../bills.service");

jest.mock("../bills.service");

describe("Bills API v2", () => {
  beforeEach(() => jest.clearAllMocks());

  test("POST /bills → 201", async () => {
    service.createBill.mockResolvedValue({ id: "bill-1" });

    const res = await request(app)
      .post("/bills")
      .send({ customer_name: "John" })
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe("bill-1");
  });

  test("POST /bills/:id/rounds → 201", async () => {
    service.addRound.mockResolvedValue({});

    const res = await request(app)
      .post("/bills/bill-1/rounds")
      .send({
        items: [{ product_id: "p1", quantity: 1, price: 100 }],
      })
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(201);
  });

  test("DELETE /bills/:id → 204", async () => {
    service.voidBill.mockResolvedValue({});

    const res = await request(app)
      .delete("/bills/bill-1")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(204);
  });
});
