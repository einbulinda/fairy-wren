// src/modules/users/__tests__/users.api.test.js
const request = require("supertest");
const app = require("../../../tests/testApp");
const service = require("../users.service");

jest.mock("../users.service");

describe("Users API v2", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /users → 201", async () => {
    service.create.mockResolvedValue({
      id: "u1",
      name: "Alice",
      role: "cashier",
    });

    const res = await request(app).post("/users").send({
      name: "Alice",
      pin: "1234",
      role: "cashier",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Alice");
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  test("POST /users → 409 when PIN already exists", async () => {
    service.create.mockRejectedValue(new Error("PIN_ALREADY_IN_USE"));

    const res = await request(app).post("/users").send({
      name: "Bob",
      pin: "1234",
      role: "cashier",
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("PIN_ALREADY_IN_USE");
  });

  test("GET /users → 200", async () => {
    service.list = jest.fn().mockResolvedValue([]);

    const res = await request(app).get("/users");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
