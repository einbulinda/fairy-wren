const request = require("supertest");
const app = require("../../../tests/testApp");
const service = require("../auth.service");

jest.mock("../auth.service");

describe("Auth API v2", () => {
  beforeEach(() => jest.clearAllMocks());

  test("POST /auth/login → 200", async () => {
    service.login.mockResolvedValue({
      token: "jwt-token",
      user: {
        id: "u1",
        name: "Alice",
        role: "cashier",
      },
    });

    const res = await request(app).post("/auth/login").send({ pin: "1234" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe("jwt-token");
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  test("POST /auth/login → 401 (invalid credentials)", async () => {
    service.login.mockRejectedValue(new Error("INVALID_CREDENTIALS"));

    const res = await request(app).post("/auth/login").send({ pin: "0000" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  test("GET /auth/me → 200", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Alice");
  });

  //   test("POST /auth/logout → 204", async () => {
  //     const res = await request(app).post("/auth/logout");

  //     expect(res.status).toBe(204);
  //   });
});
