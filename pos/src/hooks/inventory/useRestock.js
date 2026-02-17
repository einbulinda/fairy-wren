import toast from "react-hot-toast";
import { inventoryService } from "../../services/inventory.service";

export const useRestock = () => {
  const restock = async (payload) => {
    await inventoryService.restock(payload);
    toast.success("Stock added successfully");
  };

  return { restock };
};
