const stockService = require("../services/inventory.stock.service");
const productsRepo = require("../repos/inventory.products.repository");

jest.mock("../repos/inventory.products.repository");

describe("Inventory Stock Service", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns inventory items", async () => {
    productsRepo.getTrackedStock.mockResolvedValue({
      data: [{ id: "p1", name: "Pilsner", current_stock: 10 }],
      error: null,
    });

    const { data } = await stockService.getInventoryItems();

    expect(data).toHaveLength(1);
    expect(productsRepo.getTrackedStock).toHaveBeenCalled();
  });

  it("throws domain error when repo fails", async () => {
    productsRepo.getTrackedStock.mockResolvedValue({
      data: null,
      error: {},
    });

    await expect(stockService.getInventoryItems()).rejects.toThrow(
      "FAILED_TO_FETCH_INVENTORY_STOCK",
    );
  });
});
