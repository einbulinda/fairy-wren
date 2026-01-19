import { useState } from "react";
import { inventoryService } from "../../services/inventory.service";

export const useStockTake = () => {
  const [stockTake, setStockTake] = useState(null);
  const [loading, setLoading] = useState(false);

  const startStockTake = async () => {
    setLoading(true);
    const data = await inventoryService.createStockTake();
    setStockTake(data);
    setLoading(false);
    return data;
  };

  const saveItems = async (items) => {
    if (!stockTake) throw new Error("No active stock take");
    await inventoryService.addStockTakeItems(stockTake.id, items);
  };

  const completeStockTake = async () => {
    if (!stockTake) throw new Error("No active stock take");
    await inventoryService.completeStockTake(stockTake.id);
    setStockTake(null);
  };

  return {
    stockTake,
    loading,
    startStockTake,
    saveItems,
    completeStockTake,
  };
};
