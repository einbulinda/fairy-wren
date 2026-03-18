import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BillsService } from "@/services/bills.service";

/**
 * Hook to manage bills with request cancellation support
 * Prevents race conditions when params change rapidly
 * @param {Object} params - Filter parameters for listing bills
 * @returns {Object} { bills, loading, error, reload, createBill, addRound, payBill, voidBill, setBills }
 */
export const useBills = (params = {}) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use ref to track the current abort controller
  const abortControllerRef = useRef(null);

  // stable dependency
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  /**
   * Load / reload bills with cancellation support
   */
  const loadBills = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const { data } = await BillsService.list(params, controller.signal);
      
      // Only update state if this request wasn't aborted
      if (!controller.signal.aborted) {
        setBills(data);
      }
    } catch (err) {
      // Don't update error state if request was intentionally aborted
      if (err.name === "AbortError" || err.name === "CanceledError") {
        return;
      }
      if (!controller.signal.aborted) {
        setError(err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
      // Clean up ref if this was the current controller
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [paramsKey]);

  /**
   * Initial load + params change
   */
  useEffect(() => {
    loadBills();

    // Cleanup: abort any pending request when component unmounts or params change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadBills]);

  /**
   * Optimistically replace a bill in state
   */
  const replaceBill = useCallback((updatedBill) => {
    setBills((prev) =>
      prev.map((b) => (b.id === updatedBill.id ? updatedBill : b)),
    );
  }, []);

  /**
   * Create a new bill (optimistic insert)
   */
  const createBill = useCallback(async (payload) => {
    setError(null);

    try {
      const { data } = await BillsService.create(payload);
      setBills((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  /**
   * Add a round to a bill
   * (expects backend to return updated bill)
   */
  const addRound = useCallback(
    async (billId, payload) => {
      setError(null);

      try {
        const updatedBill = await BillsService.addRound(billId, payload);
        replaceBill(updatedBill);
        return updatedBill;
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [replaceBill],
  );

  /**
   * Mark bill as paid
   */
  const payBill = useCallback(
    async (billId, payload) => {
      setError(null);

      try {
        const updatedBill = await BillsService.pay(billId, payload);
        replaceBill(updatedBill);
        return updatedBill;
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [replaceBill],
  );

  /**
   * Void bill
   */
  const voidBill = useCallback(
    async (billId) => {
      setError(null);

      try {
        const updatedBill = await BillsService.void(billId);
        replaceBill(updatedBill);
        return updatedBill;
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [replaceBill],
  );

  return {
    // state
    bills,
    loading,
    error,

    // core actions
    reload: loadBills,
    createBill,

    // mutations
    setBills, // exposed intentionally (POS optimistic updates)
    addRound,
    payBill,
    voidBill,
  };
};
