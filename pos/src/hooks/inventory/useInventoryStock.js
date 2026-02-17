import { useEffect, useState } from "react";
import { inventoryService } from "../../services/inventory.service";

export const useInventoryStock = () => {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStock = async () => {
    setLoading(true);
    const data = await inventoryService.getStock();
    setStock(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStock();
  }, []);

  return { stock, loading, refresh: fetchStock };
};
