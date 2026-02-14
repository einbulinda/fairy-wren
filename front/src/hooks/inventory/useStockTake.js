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

  /* Updated Stock Take Method */

  const createStockTakeSession = async (payload) => {
    setLoading(true);
    try {
      const data = await inventoryService.createStockTakeSession(payload);
      setStockTake(data);
      setLoading(false);
      return data;
    } catch (error) {
      console.error("Error in createStockTakeSession:", error);
      setLoading(false);
      throw error;
    }
  };

  const recordStockTakeItem = async (sessionId, payload) => {
    setLoading(true);
    const data = await inventoryService.recordStockTakeItem(sessionId, payload);
    setLoading(false);
    return data;
  };

  const completeStockTake = async (currentSessionId) => {
    setLoading(true);
    const data = await inventoryService.completeStockTake(currentSessionId);
    setLoading(false);
    return data;
  };

  const getIncompleteStockTakes = async () => {
    setLoading(true);
    const data = await inventoryService.getIncompleteStockTakes();
    setLoading(false);
    return data;
  };

  const getStockTakeItems = async (sessionId) => {
    setLoading(true);
    const data = await inventoryService.getStockTakeItems(sessionId);
    setLoading(false);
    return data;
  };

  return {
    stockTake,
    loading,
    startStockTake,
    saveItems,

    createStockTakeSession,
    recordStockTakeItem,
    completeStockTake,
    getIncompleteStockTakes,
    getStockTakeItems,
  };
};
