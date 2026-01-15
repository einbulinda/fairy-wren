import { useCallback, useEffect, useState } from "react";
import {
  fetchBills,
  confirmBill as confirmBillApi,
} from "../services/payment.service";

export const usePayments = () => {
  const [bills, setBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load bills
   */
  const loadBills = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchBills();
      setBills(data);
    } catch (err) {
      console.error("Failed to load bills", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Confirm bill (payments → paid)
   */
  const processPayment = async (billId, payload) => {
    setIsLoading(true);
    setError(null);

    try {
      await confirmBillApi(billId, payload);

      // Optimistic update
      setBills((prev) =>
        prev.map((bill) =>
          bill.id === billId
            ? {
                ...bill,
                status: "completed",
                payments: bill.payments?.map((p) => ({
                  ...p,
                  is_paid: true,
                })),
              }
            : bill
        )
      );
    } catch (err) {
      console.error("Confirm bill failed", err);
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initial load
   */
  useEffect(() => {
    loadBills();
  }, [loadBills]);

  return {
    bills,
    isLoading,
    error,
    reloadBills: loadBills,
    processPayment,
  };
};
