const service = require("../categories.service");
const repo = require("../categories.repository");
const auditRepo = require("../../audit/audit.repository");

jest.mock("../categories.repository");
jest.mock("../../audit/audit.repository");

describe("Categories Service", () => {
  const context = {
    userId: "user-1",
    correlationId: "corr-1",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("list → returns categories", async () => {
    repo.findAll.mockResolvedValue({
      data: [{ id: "c1", name: "Whisky" }],
    });

    const result = await service.list();

    expect(result).toHaveLength(1);
    expect(repo.findAll).toHaveBeenCalled();
  });

  test("getById → returns category", async () => {
    repo.findById.mockResolvedValue({
      data: { id: "c1", name: "Whisky" },
    });

    const result = await service.getById("c1");

    expect(result.name).toBe("Whisky");
  });

  test("getById → throws when not found", async () => {
    repo.findById.mockResolvedValue({ data: null });

    await expect(service.getById("c1")).rejects.toThrow("CATEGORY_NOT_FOUND");
  });

  test("create → creates category and audits", async () => {
    repo.create.mockResolvedValue({
      data: { id: "c1", name: "Drinks" },
    });

    const result = await service.create({ name: "Drinks" }, context);

    expect(result.name).toBe("Drinks");
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CATEGORY_CREATED",
      }),
    );
  });

  test("create → fails on invalid payload", async () => {
    await expect(service.create({}, context)).rejects.toThrow(
      "INVALID_CATEGORY_DATA",
    );
  });

  test("update → updates category", async () => {
    repo.update.mockResolvedValue({
      data: { id: "c1", name: "Updated" },
    });

    const result = await service.update("c1", { name: "Updated" }, context);

    expect(result.name).toBe("Updated");
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CATEGORY_UPDATED",
      }),
    );
  });

  test("update → fails when no fields", async () => {
    await expect(service.update("c1", {}, context)).rejects.toThrow(
      "NO_FIELDS_TO_UPDATE",
    );
  });

  test("archive → archives category", async () => {
    repo.archive.mockResolvedValue({});

    await service.archive("c1", false, context);

    expect(repo.archive).toHaveBeenCalledWith("c1", false);
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CATEGORY_ARCHIVED",
      }),
    );
  });
});
