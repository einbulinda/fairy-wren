import { useState } from "react";
import { inventoryService } from "../../services/inventory.service";

export const useInventoryReports = () => {
  const [loading, setLoading] = useState(false);

  const stockTakeReports = async (params) => {
    setLoading(true);
    const data = await inventoryService.stockTakeReports(params);
    setLoading(false);
    return data;
  };

  return {
    stockTakeReports,
    loading,
  };
};
