const request = require("supertest");
const app = require("../../../tests/testApp");
const service = require("../suppliers.service");

jest.mock("../suppliers.service");

describe("Suppliers API v2", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /suppliers → 200", async () => {
    service.list.mockResolvedValue([{ id: "s1", name: "ABC Ltd" }]);

    const res = await request(app)
      .get("/suppliers")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test("POST /suppliers → 201", async () => {
    service.create.mockResolvedValue({
      id: "s1",
      name: "XYZ Ltd",
    });

    const res = await request(app)
      .post("/suppliers")
      .send({ name: "XYZ Ltd" })
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("XYZ Ltd");
  });

  test("GET /suppliers/:id → 200", async () => {
    service.getById.mockResolvedValue({
      id: "s1",
      name: "ABC Ltd",
    });

    const res = await request(app)
      .get("/suppliers/s1")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("ABC Ltd");
  });

  test("PATCH /suppliers/:id → 200", async () => {
    service.update.mockResolvedValue({
      id: "s1",
      name: "Updated Supplier",
    });

    const res = await request(app)
      .patch("/suppliers/s1")
      .send({ name: "Updated Supplier" })
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Supplier");
  });

  test("DELETE /suppliers/:id → 204", async () => {
    service.archive.mockResolvedValue();

    const res = await request(app)
      .delete("/suppliers/s1?active=false")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(204);
  });
});
