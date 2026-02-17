import { useEffect, useState } from "react";
import { createExpense, fetchExpenses } from "../services/expense.service";

export const useExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load Expenses
  const load = async () => {
    setIsLoading(true);

    try {
      const data = await fetchExpenses();

      setExpenses(data);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add Expense
  const addExpense = async (payload) => {
    setIsLoading(true);

    try {
      const newExpense = await createExpense(payload);
      setExpenses((prev) => [newExpense, ...prev]);
      return newExpense;
    } catch (err) {
      setError(err.message || "Failed to save expense details");
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
    addExpense,
  };
};
