const request = require("supertest");
const app = require("../../../tests/testApp");
const service = require("../products.service");

jest.mock("../products.service");

describe("Products API", () => {
  beforeEach(() => jest.clearAllMocks());

  test("POST /products → 201", async () => {
    service.create.mockResolvedValue({
      id: "p1",
      name: "Tusker",
      category_id: "c-001",
      price: 250,
    });
    const res = await request(app)
      .post("/products")
      .send({ name: "Tusker", category_id: "c-001", price: 250 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Tusker");
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  test("GET /products → 200", async () => {
    service.list.mockResolvedValue([]);

    const res = await request(app).get("/products");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("PUT /products/:id → 200", async () => {
    service.update.mockResolvedValue({
      id: "p1",
      name: "Tusker",
      price: 250,
    });

    const res = await request(app).put("/products/p1").send({ price: 250 });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(250);
  });

  test("DELETE /products/:id → 204", async () => {
    service.archive.mockResolvedValue();

    const res = await request(app).delete("/products/p1");

    expect(res.status).toBe(204);
  });
});
