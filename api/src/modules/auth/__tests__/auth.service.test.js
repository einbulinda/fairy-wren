const service = require("../auth.service");
const repo = require("../auth.repository");
const auditRepo = require("../../audit/audit.repository");
const bcrypt = require("bcrypt");

jest.mock("../auth.repository", () => ({
  findActiveUserByFingerprint: jest.fn(),
}));

jest.mock("../../audit/audit.repository", () => ({
  log: jest.fn(),
}));

jest.mock("bcrypt");

describe("Auth Service", () => {
  const context = { correlationId: "corr-1" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("logs in user with valid PIN", async () => {
    repo.findActiveUserByFingerprint.mockResolvedValue({
      data: {
        id: "u1",
        name: "Alice",
        role: "cashier",
        active: true,
        pin_hash: "hashed",
      },
    });

    bcrypt.compare.mockResolvedValue(true);

    const result = await service.login({ pin: "1234" }, context);

    expect(result.token).toBeDefined();
    expect(result.user.name).toBe("Alice");
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "LOGIN_SUCCESS",
        entity_id: "u1",
      }),
    );
  });

  test("fails when PIN missing", async () => {
    await expect(service.login({}, context)).rejects.toThrow(
      "INVALID_CREDENTIALS",
    );
  });

  test("fails for invalid PIN (no user)", async () => {
    repo.findActiveUserByFingerprint.mockResolvedValue({
      data: null,
    });

    await expect(service.login({ pin: "9999" }, context)).rejects.toThrow(
      "INVALID_CREDENTIALS",
    );

    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOGIN_FAILED" }),
    );
  });

  test("fails for invalid PIN (hash mismatch)", async () => {
    repo.findActiveUserByFingerprint.mockResolvedValue({
      data: {
        id: "u1",
        name: "Alice",
        role: "cashier",
        pin_hash: "hashed",
        active: true,
      },
    });

    bcrypt.compare.mockResolvedValue(false);

    await expect(service.login({ pin: "1234" }, context)).rejects.toThrow(
      "INVALID_CREDENTIALS",
    );

    expect(auditRepo.log).toHaveBeenCalled();
  });
});
