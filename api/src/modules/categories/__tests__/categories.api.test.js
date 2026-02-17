const request = require("supertest");
const app = require("../../../tests/testApp");
const service = require("../categories.service");

jest.mock("../categories.service");

describe("Categories API v2", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /categories → 200", async () => {
    service.list.mockResolvedValue([{ id: "c1", name: "Whisky" }]);

    const res = await request(app)
      .get("/categories")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test("POST /categories → 201", async () => {
    service.create.mockResolvedValue({
      id: "c1",
      name: "Drinks",
    });

    const res = await request(app)
      .post("/categories")
      .send({ name: "Drinks" })
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Drinks");
  });

  test("GET /categories/:id → 200", async () => {
    service.getById.mockResolvedValue({
      id: "c1",
      name: "Whisky",
    });

    const res = await request(app)
      .get("/categories/c1")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Whisky");
  });

  test("PATCH /categories/:id → 200", async () => {
    service.update.mockResolvedValue({
      id: "c1",
      name: "Updated",
    });

    const res = await request(app)
      .patch("/categories/c1")
      .send({ name: "Updated" })
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated");
  });

  test("DELETE /categories/:id → 204", async () => {
    service.archive.mockResolvedValue();

    const res = await request(app)
      .delete("/categories/c1?active=false")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(204);
  });
});
