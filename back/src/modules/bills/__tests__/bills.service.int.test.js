const billsService = require("../bills.service");
const billsRepo = require("../bills.repository");
const inventoryService = require("../../inventory/inventory.service");
const auditRepo = require("../../audit/audit.repository");

jest.mock("../bills.repository");
jest.mock("../../inventory/inventory.service");
jest.mock("../../audit/audit.repository");

describe("Bills ↔ Inventory Integration", () => {
  const context = {
    userId: "user-1",
    correlationId: "corr-1",
  };

  beforeEach(() => jest.clearAllMocks());

  test("addRound → validates stock, deducts inventory, creates round", async () => {
    billsRepo.getNextRoundNumber.mockResolvedValue(1);

    billsRepo.createRound.mockResolvedValue({
      data: { id: "round-1" },
    });

    billsRepo.insertRoundItems.mockResolvedValue({});

    inventoryService.assertStockAvailable.mockResolvedValue();
    inventoryService.consumeStockForSale.mockResolvedValue();

    const result = await billsService.addRound(
      "bill-1",
      {
        items: [{ product_id: "prod-1", quantity: 2, price: 100 }],
      },
      context,
    );

    expect(inventoryService.assertStockAvailable).toHaveBeenCalled();
    expect(inventoryService.consumeStockForSale).toHaveBeenCalledWith(
      expect.objectContaining({
        billId: "bill-1",
        userId: "user-1",
      }),
    );

    expect(billsRepo.createRound).toHaveBeenCalled();
    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ROUND_CREATED",
      }),
    );
  });

  test("addRound → fails when stock is insufficient", async () => {
    inventoryService.assertStockAvailable.mockRejectedValue(
      new Error("INSUFFICIENT_STOCK"),
    );

    await expect(
      billsService.addRound(
        "bill-1",
        { items: [{ product_id: "p1", quantity: 10 }] },
        context,
      ),
    ).rejects.toThrow("INSUFFICIENT_STOCK");

    expect(billsRepo.createRound).not.toHaveBeenCalled();
  });

  test("voidBill → restores inventory and voids bill", async () => {
    inventoryService.restoreStockForBill.mockResolvedValue();
    billsRepo.updateBillStatus.mockResolvedValue({});

    await billsService.voidBill("bill-1", { reason: "Mistake" }, context);

    expect(inventoryService.restoreStockForBill).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "bill-1",
        userId: "user-1",
      }),
    );

    expect(billsRepo.updateBillStatus).toHaveBeenCalledWith(
      "bill-1",
      "void",
      "user-1",
    );

    expect(auditRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "BILL_VOIDED",
      }),
    );
  });
});
