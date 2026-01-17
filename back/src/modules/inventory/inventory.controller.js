const inventoryService = require("./inventory.service");

exports.getStock = async (req, res) => {
  try {
    const data = await inventoryService.getStock();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.restock = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity, unitCost, notes } = req.body;

    await inventoryService.restock({
      productId,
      quantity,
      unitCost,
      userId,
      notes,
    });

    res.json({ message: "Stock restocked successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.createStockTake = async (req, res) => {
  try {
    const stockTake = await inventoryService.createStockTake(req.user.id);
    res.json(stockTake);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveStockTakeItems = async (req, res) => {
  try {
    const { id: stockTakeId } = req.params;
    const { items } = req.body;

    await inventoryService.saveStockTakeItems(stockTakeId, items);
    res.json({ message: "Stock take items saved", success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.completeStockTake = async (req, res) => {
  try {
    const { id: stockTakeId } = req.params;
    const userId = req.user.id;

    await inventoryService.completeStockTake(stockTakeId, userId);

    res.json({ message: "Stock take completed" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getLedger = async (req, res) => {
  try {
    const data = await inventoryService.getLedger(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.receiveInventory = async (req, res) => {
  try {
    const receipt = await inventoryService.receiveInventory({
      ...req.body,
      userId: req.user.id,
    });

    res.status(201).json({
      success: true,
      receipt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
