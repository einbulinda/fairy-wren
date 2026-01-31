const service = require("../users.service");
const repo = require("../users.repository");
const auditRepo = require("../../audit/audit.repository");

jest.mock("../users.repository");
jest.mock("../../audit/audit.repository");

describe("Users Service", () => {
  const context = {
    userId: "admin-1",
    correlationId: "corr-123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("creates user and writes audit log", async () => {
    repo.userExists.mockResolvedValue({ data: null });
    repo.create.mockResolvedValue({
      data: {
        id: "u1",
        name: "Alice",
        role: "cashier",
        //pin: "0000",
        active: true,
      },
    });
    auditRepo.log.mockResolvedValue({});

    const result = await service.create(
      { name: "Alice", pin: "1234", role: "cashier" },
      context,
    );

    expect(repo.userExists).toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Alice",
        role: "cashier",
        active: true,
      }),
    );

    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "USER_CREATED",
        entity: "profiles",
        performed_by: context.userId,
        correlation_id: context.correlationId,
      }),
    );

    expect(result.name).toBe("Alice");
  });

  test("fails when required fields are missing", async () => {
    await expect(service.create({ pin: "1234" }, context)).rejects.toThrow(
      "INVALID_USER_DATA",
    );
  });

  test("fails when PIN is already in use (pre-check)", async () => {
    repo.userExists.mockResolvedValue({
      data: { id: "existing-user" },
    });

    await expect(
      service.create({ name: "Bob", pin: "1234", role: "cashier" }, context),
    ).rejects.toThrow("PIN_ALREADY_IN_USE");
  });

  test("handles unique constraint race condition safely", async () => {
    repo.userExists.mockResolvedValue({ data: null });
    repo.create.mockResolvedValue({
      data: null,
      error: { code: "23505" },
    });

    await expect(
      service.create({ name: "Eve", pin: "6767", role: "manager" }, context),
    ).rejects.toThrow("PIN_ALREADY_IN_USE");
  });
});
