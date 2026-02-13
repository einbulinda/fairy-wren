import { useState, useEffect, useCallback, useMemo } from "react";
import { BillsService } from "@/services/bills.service";

export const useBills = (params = {}) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // stable dependency
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  /**
   * Load / reload bills
   */
  const loadBills = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await BillsService.list(params);
      setBills(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  /**
   * Initial load + params change
   */
  useEffect(() => {
    loadBills();
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

    const { data } = await BillsService.create(payload);

    setBills((prev) => [data, ...prev]);
    return data;
  }, []);

  /**
   * Add a round to a bill
   * (expects backend to return updated bill)
   */
  const addRound = useCallback(
    async (billId, payload) => {
      setError(null);

      const updatedBill = await BillsService.addRound(billId, payload);
      replaceBill(updatedBill);

      return updatedBill;
    },
    [replaceBill],
  );

  /**
   * Mark bill as paid
   */
  const payBill = useCallback(
    async (billId, payload) => {
      setError(null);

      const updatedBill = await BillsService.pay(billId, payload);
      replaceBill(updatedBill);

      return updatedBill;
    },
    [replaceBill],
  );

  /**
   * Void bill
   */
  const voidBill = useCallback(
    async (billId) => {
      setError(null);

      const updatedBill = await BillsService.void(billId);
      replaceBill(updatedBill);

      return updatedBill;
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
