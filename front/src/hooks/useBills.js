import { useState, useEffect } from "react";
import { BillsService } from "@/services/bills.service";

export const useBills = (params = {}) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    BillsService.list(params)
      .then(({ data }) => {
        if (active) setBills(data);
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

  return { bills, loading, error };

  // const loadAllBills = useCallback(async () => {
  //   setIsLoading(true);
  //   setError(null);

  //   try {
  //     const data = await fetchAllBills();
  //     setAllBills(usersBills(data, user));
  //   } catch (err) {
  //     setError(err.message || "Failed to load bills");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [user]);

  // /**
  //  * Create a new bill
  //  */
  // const openBill = async (payload) => {
  //   setIsLoading(true);
  //   setError(null);

  //   try {
  //     const newBill = await createBill(payload);
  //     setBills((prev) => [newBill, ...prev]); // optimistic insert
  //     return newBill;
  //   } catch (err) {
  //     setError(err.message || "Failed to create bill");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // /**
  //  * Add a round to a bill
  //  */
  // const addRound = async (billId, payload) => {
  //   setIsLoading(true);
  //   setError(null);

  //   try {
  //     const updatedBill = await addBillRound(billId, payload);

  //     setBills((prev) =>
  //       prev.map((bill) => (bill.id === billId ? updatedBill : bill)),
  //     );

  //     return updatedBill;
  //   } catch (err) {
  //     setError(err.message || "Failed to add round");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // /**
  //  * Mark bill as paid
  //  */
  // const payBill = async (billId, payload) => {
  //   setIsLoading(true);
  //   setError(null);

  //   try {
  //     const updatedBill = await markBillPaid(billId, payload);

  //     setBills((prev) =>
  //       prev.map((bill) => (bill.id === billId ? updatedBill : bill)),
  //     );

  //     return updatedBill;
  //   } catch (err) {
  //     setError(err.message || "Failed to mark bill as paid");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // /**
  //  * Void bill
  //  */
  // const cancelBill = async (billId) => {
  //   setIsLoading(true);
  //   setError(null);
  //   try {
  //     const updatedBill = await voidBill(billId);
  //     setBills((prev) =>
  //       prev.map((bill) => (bill.id === billId ? updatedBill : bill)),
  //     );
  //     return updatedBill;
  //   } catch (err) {
  //     setError(err.message || "Failed to void bill");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // /**
  //  * Auto-load open bills on mount
  //  */
  // useEffect(() => {
  //   // loadOpenBills();
  //   loadAllBills();
  // }, [loadAllBills]);

  // return {
  //   bills,
  //   isLoading,
  //   error,
  //   allBills,

  //   reload: loadAllBills,
  //   openBill,
  //   addRound,
  //   payBill,
  //   cancelBill,
  // };
};
