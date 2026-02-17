import { useEffect, useState } from "react";
import { PaymentService } from "@/services/payment.service";

export const usePayments = (params = {}) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    PaymentService.list(params)
      .then((data) => {
        if (active) setPayments(data);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [JSON.stringify(params)]);

  return { payments, loading, error };

  /**
   * Load bills
   */
  // const loadBills = useCallback(async () => {
  //   setIsLoading(true);
  //   setError(null);

  //   try {
  //     const data = await fetchBills();
  //     setBills(data);
  //   } catch (err) {
  //     console.error("Failed to load bills", err);
  //     setError(err);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, []);

  // /**
  //  * Confirm bill (payments → paid)
  //  */
  // const processPayment = async (billId, payload) => {
  //   setIsLoading(true);
  //   setError(null);

  //   try {
  //     await confirmBillApi(billId, payload);

  //     // Optimistic update
  //     setBills((prev) =>
  //       prev.map((bill) =>
  //         bill.id === billId
  //           ? {
  //               ...bill,
  //               status: "completed",
  //               payments: bill.payments?.map((p) => ({
  //                 ...p,
  //                 is_paid: true,
  //               })),
  //             }
  //           : bill,
  //       ),
  //     );
  //   } catch (err) {
  //     console.error("Confirm bill failed", err);
  //     setError(err);
  //     throw err;
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // /**
  //  * Initial load
  //  */
  // useEffect(() => {
  //   loadBills();
  // }, [loadBills]);

  // return {
  //   bills,
  //   isLoading,
  //   error,
  //   reloadBills: loadBills,
  //   processPayment,
  // };
};
