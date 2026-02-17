const restockService = require("../services/inventory.restock.service");
const productsRepo = require("../repos/inventory.products.repository");
const ledgerRepo = require("../repos/inventory.ledger.repository");

jest.mock("../repos/inventory.products.repository");
jest.mock("../repos/inventory.ledger.repository");

describe("Inventory Restock Service", () => {
  afterEach(() => jest.clearAllMocks());

  it("restocks product and calculates weighted average", async () => {
    productsRepo.getProductCostSnapshot.mockResolvedValue({
      data: { current_stock: 10, cost_price: 100 },
      error: null,
    });

    ledgerRepo.insertLedgerEntry.mockResolvedValue({ error: null });
    productsRepo.updateStockAndCost.mockResolvedValue({ error: null });

    const result = await restockService.restock(
      {
        productId: "p1",
        quantity: 10,
        unitCost: 200,
      },
      { userId: "u1" },
    );

    expect(result.newStock).toBe(20);
    expect(result.newAvgCost).toBe(150);
  });

  it("throws when product not found", async () => {
    productsRepo.getProductCostSnapshot.mockResolvedValue({
      data: null,
      error: {},
    });

    await expect(
      restockService.restock(
        { productId: "p1", quantity: 5, unitCost: 10 },
        { userId: "u1" },
      ),
    ).rejects.toThrow("PRODUCT_NOT_FOUND");
  });
});
