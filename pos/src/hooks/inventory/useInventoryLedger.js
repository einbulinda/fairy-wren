import { useEffect, useState } from "react";
import { inventoryService } from "../../services/inventory.service";

export const useInventoryLedger = (filters = {}) => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryService.getLedger(filters).then((data) => {
      setLedger(data);
      setLoading(false);
    });
  }, [filters]);

  return { ledger, loading };
};
