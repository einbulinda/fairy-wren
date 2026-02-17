const service = require("../suppliers.service");
const repo = require("../suppliers.repository");
const auditRepo = require("../../audit/audit.repository");

jest.mock("../suppliers.repository");
jest.mock("../../audit/audit.repository");

describe("Suppliers Service", () => {
  const context = {
    userId: "user-1",
    correlationId: "corr-1",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("list → returns suppliers", async () => {
    repo.findAll.mockResolvedValue({
      data: [{ id: "s1", name: "ABC Ltd" }],
    });

    const result = await service.list();

    expect(result).toHaveLength(1);
    expect(repo.findAll).toHaveBeenCalled();
  });

  test("getById → returns supplier", async () => {
    repo.findById.mockResolvedValue({
      data: { id: "s1", name: "ABC Ltd" },
    });

    const result = await service.getById("s1");

    expect(result.name).toBe("ABC Ltd");
  });

  test("getById → throws when not found", async () => {
    repo.findById.mockResolvedValue({ data: null });

    await expect(service.getById("s1")).rejects.toThrow("SUPPLIER_NOT_FOUND");
  });

  test("create → creates supplier and audits", async () => {
    repo.create.mockResolvedValue({
      data: { id: "s1", name: "XYZ Ltd" },
    });

    const result = await service.create({ name: "XYZ Ltd" }, context);

    expect(result.name).toBe("XYZ Ltd");
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SUPPLIER_CREATED",
      }),
    );
  });

  test("create → fails on invalid payload", async () => {
    await expect(service.create({}, context)).rejects.toThrow(
      "INVALID_SUPPLIER_DATA",
    );
  });

  test("update → updates supplier", async () => {
    repo.update.mockResolvedValue({
      data: { id: "s1", name: "Updated Supplier" },
    });

    const result = await service.update(
      "s1",
      { name: "Updated Supplier" },
      context,
    );

    expect(result.name).toBe("Updated Supplier");
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SUPPLIER_UPDATED",
      }),
    );
  });

  test("update → fails when no fields", async () => {
    await expect(service.update("s1", {}, context)).rejects.toThrow(
      "NO_FIELDS_TO_UPDATE",
    );
  });

  test("archive → archives supplier", async () => {
    repo.archive.mockResolvedValue({});

    await service.archive("s1", { active: false }, context);

    expect(repo.archive).toHaveBeenCalledWith("s1", { active: false });
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SUPPLIER_ARCHIVED",
      }),
    );
  });
});
