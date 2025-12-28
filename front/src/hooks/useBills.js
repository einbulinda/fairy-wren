import { useState, useCallback, useEffect } from "react";
import {
  fetchOpenBills,
  createBill,
  addBillRound,
  confirmBillPayment,
  markBillPaid,
} from "../services/bills.service";
import { useAuth } from "./useAuth";
import { usersBills } from "../utils/common";

/**
 * useBills
 * Centralized state & business logic for bills
 */

export const useBills = () => {
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  /**
   * Load open bills
   */
  const loadOpenBills = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchOpenBills();
      setBills(usersBills(data, user));
    } catch (err) {
      setError(err.message || "Failed to load bills");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Create a new bill
   */
  const openBill = async (payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const newBill = await createBill(payload);
      setBills((prev) => [newBill, ...prev]); // optimistic insert
      return newBill;
    } catch (err) {
      setError(err.message || "Failed to create bill");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Add a round to a bill
   */
  const addRound = async (billId, payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedBill = await addBillRound(billId, payload);

      setBills((prev) =>
        prev.map((bill) => (bill.id === billId ? updatedBill : bill))
      );

      return updatedBill;
    } catch (err) {
      setError(err.message || "Failed to add round");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Mark bill as paid
   */
  const payBill = async (billId, payload) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedBill = await markBillPaid(billId, payload);

      setBills((prev) =>
        prev.map((bill) => (bill.id === billId ? updatedBill : bill))
      );

      return updatedBill;
    } catch (err) {
      setError(err.message || "Failed to mark bill as paid");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Confirm payment (manager confirmation)
   */
  const confirmPayment = async (billId) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedBill = await confirmBillPayment(billId);

      // bill is no longer open → remove from open bills list
      setBills((prev) => prev.filter((bill) => bill.id !== billId));

      return updatedBill;
    } catch (err) {
      setError(err.message || "Failed to confirm payment");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Auto-load open bills on mount
   */
  useEffect(() => {
    loadOpenBills();
  }, [loadOpenBills]);

  return {
    bills,
    isLoading,
    error,

    reload: loadOpenBills,
    openBill,
    addRound,
    payBill,
    confirmPayment,
  };
};
