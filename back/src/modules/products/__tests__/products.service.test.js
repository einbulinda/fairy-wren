const service = require("../products.service");
const repo = require("../products.repository");
const auditRepo = require("../../audit/audit.repository");

jest.mock("../products.repository");
jest.mock("../../audit/audit.repository");

describe("Products Service", () => {
  const context = {
    userId: "user-123",
    correlationId: "corr-123",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Creates product and writes audit logs ", async () => {
    repo.create.mockResolvedValue({
      data: { id: "p1", name: "Milk", price: 80 },
    });

    auditRepo.log.mockResolvedValue({});

    const result = await service.create({ name: "Milk", price: 80 }, context);

    expect(repo.create).toHaveBeenCalled();
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE",
        entity: "product",
        performed_by: context.userId,
      }),
    );
    expect(result.name).toBe("Milk");
  });

  test("fails when product name missing", async () => {
    await expect(service.create({ price: 100 }, context)).rejects.toThrow(
      "INVALID_PRODUCT_DATA",
    );
  });

  test("updates product", async () => {
    repo.update.mockResolvedValue({
      data: { id: "p1", name: "Milk", price: 90 },
    });
    auditRepo.log.mockResolvedValue({});

    const result = await service.update("p1", { price: 90 }, context);

    expect(repo.update).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ price: 90 }),
    );
    expect(result.price).toBe(90);
  });

  test("archives product and logs audit", async () => {
    repo.archive.mockResolvedValue({});
    auditRepo.log.mockResolvedValue({});

    await service.archive("p1", context);

    expect(repo.archive).toHaveBeenCalledWith("p1");
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ARCHIVE",
        entity_id: "p1",
      }),
    );
  });
});
