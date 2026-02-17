const request = require("supertest");
const app = require("../../../tests/testApp");

jest.mock("../services/inventory.stock.service");
// jest.mock("../services/inventory.restock.service");
jest.mock("../services/inventory.receiving.service");
jest.mock("../services/inventory.stocktake.service");
jest.mock("../../ledger/ledger.service");

const stockService = require("../services/inventory.stock.service");
// const restockService = require("../services/inventory.restock.service");
const receivingService = require("../services/inventory.receiving.service");
const stockTakeService = require("../services/inventory.stocktake.service");
const ledgerService = require("../../ledger/ledger.service");

describe("Inventory API", () => {
  afterEach(() => jest.clearAllMocks());

  it("GET /inventory/items", async () => {
    stockService.getInventoryItems.mockResolvedValue([]);

    const res = await request(app).get("/items");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
  /*
  it("POST /restock", async () => {
    restockService.restock.mockResolvedValue({
      productId: "p1",
      newStock: 20,
    });

    const res = await request(app)
      .post("/restock")
      .send({ productId: "p1", quantity: 10, unitCost: 100 });

    expect(res.status).toBe(201);
    expect(res.body.data.newStock).toBe(20);
  });
  */

  it("POST /stock-take-sessions", async () => {
    stockTakeService.createSession.mockResolvedValue({
      stockTakeId: "stk1",
    });

    const res = await request(app)
      .post("/stock-take-sessions")
      .send({ stockTakeName: "Weekly Count" });

    expect(res.status).toBe(201);
    expect(res.body.data.stockTakeId).toBe("stk1");
  });

  it("GET /ledger", async () => {
    ledgerService.getLedger.mockResolvedValue([]);

    const res = await request(app).get("/ledger");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
