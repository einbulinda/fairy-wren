import { useEffect, useState } from "react";
import expenseAPI from "../services/expense.service";

export const useExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load Expenses
  const load = async () => {
    setIsLoading(true);

    try {
      const data = await expenseAPI.fetchExpenses();
      setExpenses(data);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return {
    expenses,
    isLoading,
    error,
    reload: load,
    addExpense: expenseAPI.createExpense,
  };
};
