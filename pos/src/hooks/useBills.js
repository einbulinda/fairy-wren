import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BillsService } from "@/services/bills.service";
import { useAppStore } from "@/store/app.store";

/**
 * Hook to manage bills with request cancellation support
 * Uses Zustand store for shared state across components
 * Prevents race conditions when params change rapidly
 * @param {Object} params - Filter parameters for listing bills (defaults to active bills)
 * @returns {Object} { bills, pagination, loading, error, reload, createBill, addRound, payBill, voidBill, setBills }
 */
export const useBills = (params = { active: true }) => {
  // Get store state and actions - ensure bills is always an array
  const storeBills = useAppStore((state) => state.bills || []);
  const storeSetBills = useAppStore((state) => state.setBills);
  const storeSetLoading = useAppStore((state) => state.setBillsLoading);
  const storeSetError = useAppStore((state) => state.setBillsError);
  const billsReloadTrigger = useAppStore((state) => state.billsReloadTrigger);

  // Local loading state for this hook instance
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

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

    setLocalLoading(true);
    storeSetLoading(true);
    setError(null);
    storeSetError(null);

    try {
      const { bills, pagination: pg } = await BillsService.list(params, controller.signal);

      // Only update state if this request wasn't aborted
      if (!controller.signal.aborted) {
        storeSetBills(bills);
        setPagination(pg);
      }
    } catch (err) {
      // Don't update error state if request was intentionally aborted
      if (err.name === "AbortError" || err.name === "CanceledError") {
        return;
      }
      if (!controller.signal.aborted) {
        setError(err);
        storeSetError(err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLocalLoading(false);
        storeSetLoading(false);
      }
      // Clean up ref if this was the current controller
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [paramsKey, storeSetBills, storeSetLoading, storeSetError]);

  /**
   * Initial load + params change + reload trigger from store
   */
  useEffect(() => {
    loadBills();

    // Cleanup: abort any pending request when component unmounts or params change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadBills, billsReloadTrigger]); // Added billsReloadTrigger as dependency

  /**
   * Optimistically replace a bill in state
   */
  const replaceBill = useCallback((updatedBill) => {
    storeSetBills(
      storeBills.map((b) => (b.id === updatedBill.id ? updatedBill : b))
    );
  }, [storeBills, storeSetBills]);

  /**
   * Create a new bill (optimistic insert)
   */
  const createBill = useCallback(async (payload) => {
    setError(null);

    try {
      const newBill = await BillsService.create(payload);
      storeSetBills([newBill, ...storeBills]);
      return newBill;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [storeBills, storeSetBills]);

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
   * Exchange a round item for a replacement product
   */
  const exchangeItem = useCallback(
    async (billId, payload) => {
      setError(null);
      try {
        await BillsService.exchange(billId, payload);
        // Reload to get updated bill with new round
        await loadBills();
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [loadBills],
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
    // state - from store for shared access - ensure bills is always an array
    bills: storeBills || [],
    pagination,
    loading: localLoading,
    error,

    // core actions
    reload: loadBills,
    createBill,

    // mutations
    setBills: storeSetBills,
    addRound,
    payBill,
    voidBill,
    exchangeItem,
  };
};
