import { useEffect, useState } from "react";
import {
  createAccounts,
  fetchAccounts,
  toggleStatus,
  updateAccount,
} from "../services/accounts.service";

export const useAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAccounts = async () => {
    setIsLoading(true);

    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  return {
    accounts,
    isLoading,
    error,
    reload: loadAccounts,
    addAccount: createAccounts,
    editAccount: updateAccount,
    deactivateAccount: toggleStatus,
  };
};
