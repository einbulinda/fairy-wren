const productsRepo = require("../repos/inventory.products.repository");

exports.getInventoryItems = async () => {
  const { data, error } = await productsRepo.getTrackedStock();

  if (error) {
    console.log("Error fetching inventory stock:", error);
    throw new Error("FAILED_TO_FETCH_INVENTORY_STOCK");
  }

  return data;
};
