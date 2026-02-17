import { useCallback, useState } from "react";
import { inventoryService } from "../../services/inventory.service";

export const useReceiveInventory = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const receiveInventory = useCallback(async (payload) => {
    try {
      setLoading(true);
      setError(null);

      const response = await inventoryService.receiveStock(payload);
      return response.data;
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to receive inventory";

      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { receiveInventory, loading, error };
};
