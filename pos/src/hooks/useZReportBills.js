import { useState, useEffect, useCallback } from "react";
import { BillsService } from "@/services/bills.service";

/**
 * Fetches all bills for a given date (all pages) for Z-Report drill-down.
 */
export const useZReportBills = (date) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
      let page = 1;
      const limit = 100;
      let all = [];
      while (true) {
        const { bills: chunk, pagination } = await BillsService.list({
          startDate: date,
          endDate: date,
          page,
          limit,
        });
        all = all.concat(chunk || []);
        if (page >= (pagination?.totalPages ?? 1)) break;
        page++;
      }
      setBills(all);
    } catch {
      // silently fail — Z-report still works without drill-down
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  return { bills, loading };
};
