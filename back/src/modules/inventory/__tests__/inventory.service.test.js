const service = require("../services/inventory.sale.service");
const repo = require("../repos/inventory.bills.repository");
const ledgerService = require("../../ledger/ledger.service");

jest.mock("../repos/inventory.bills.repository");
jest.mock("../../ledger/ledger.service");

describe("Inventory Service", () => {
  beforeEach(() => jest.clearAllMocks());

  test("assertStockAvailable → throws when insufficient", async () => {
    repo.getCurrentStock.mockResolvedValue({
      data: { current_stock: 2 },
    });

    await expect(
      service.assertStockAvailable([{ product_id: "p1", quantity: 5 }]),
    ).rejects.toThrow("INSUFFICIENT_STOCK");
  });

  test("consumeStockForSale → posts ledger and decrements stock", async () => {
    await service.consumeStockForSale({
      billId: "b1",
      userId: "u1",
      items: [{ product_id: "p1", quantity: 2 }],
    });

    expect(ledgerService.postBillToLedger).toHaveBeenCalled();
    expect(repo.incrementStock).toHaveBeenCalledWith("p1", -2);
  });

  test("restoreStockForBill → restores stock and ledger", async () => {
    repo.getBillItems.mockResolvedValue({
      data: [{ product_id: "p1", quantity: 3 }],
    });

    await service.restoreStockForBill({
      billId: "b1",
      userId: "u1",
      reason: "Void",
    });

    expect(ledgerService.reverseBillLedger).toHaveBeenCalled();
    expect(repo.incrementStock).toHaveBeenCalledWith("p1", 3);
  });
});
