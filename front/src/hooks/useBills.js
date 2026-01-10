import { useState, useCallback, useEffect } from "react";
import {
  fetchAllBills,
  createBill,
  addBillRound,
  voidBill,
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
  const [allBills, setAllBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  /**
   * Load open bills
   */
  const loadAllBills = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchAllBills();
      setAllBills(usersBills(data, user));
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
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Void bill
   */
  const cancelBill = async (billId) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedBill = await voidBill(billId);
      setBills((prev) =>
        prev.map((bill) => (bill.id === billId ? updatedBill : bill))
      );
      return updatedBill;
    } catch (err) {
      setError(err.message || "Failed to void bill");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Auto-load open bills on mount
   */
  useEffect(() => {
    // loadOpenBills();
    loadAllBills();
  }, [loadAllBills]);

  return {
    bills,
    isLoading,
    error,
    allBills,

    reload: loadAllBills,
    openBill,
    addRound,
    payBill,
    cancelBill,
  };
};
