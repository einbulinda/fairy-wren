const productsRepo = require("../repos/inventory.products.repository");

exports.getInventoryItems = async () => {
  const { data, error } = productsRepo.getTrackedStock();

  if (error) {
    throw new Error("FAILED_TO_FETCH_INVENTORY_STOCK");
  }

  return data;
};
