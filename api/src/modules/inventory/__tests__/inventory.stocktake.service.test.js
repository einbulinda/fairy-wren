const service = require("../services/inventory.stocktake.service");
const repo = require("../repos/inventory.stocktake.repository");
const readRepo = require("../repos/inventory.read.repository");

jest.mock("../repos/inventory.stocktake.repository");
jest.mock("../repos/inventory.read.repository");

describe("Inventory Stock Take Service", () => {
  afterEach(() => jest.clearAllMocks());

  it("creates stock take session", async () => {
    repo.createSession.mockResolvedValue({
      data: "stk1",
      error: null,
    });

    const result = await service.createSession(
      { stockTakeName: "Monthly Count" },
      { userId: "u1", correlationId: "c1" },
    );

    expect(result.stockTakeId).toBe("stk1");
  });

  it("fetches incomplete stock takes", async () => {
    readRepo.getIncompleteStockTakes.mockResolvedValue({
      data: [{ id: "stk1" }],
      error: null,
    });

    const result = await service.getIncompleteSessions("u1");
    expect(result).toHaveLength(1);
  });
});
