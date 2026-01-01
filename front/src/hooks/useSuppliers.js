import { useEffect, useState } from "react";
import {
  createSupplier,
  fetchSuppliers,
  editSupplier,
} from "../services/suppliers.service";

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSuppliers = async () => {
    setIsLoading(true);

    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  return {
    suppliers,
    isLoading,
    error,
    reload: loadSuppliers,
    addSupplier: createSupplier,
    updateSupplier: editSupplier,
  };
};
