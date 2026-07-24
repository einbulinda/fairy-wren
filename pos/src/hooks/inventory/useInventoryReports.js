import { useState, useEffect } from "react";
import { inventoryService } from "../../services/inventory.service";

export const useInventoryReports = () => {
  const [loading, setLoading] = useState(false);

  const stockTakeReports = async (params) => {
    setLoading(true);
    const data = await inventoryService.stockTakeReports(params);
    setLoading(false);
    return data;
  };

  return {
    stockTakeReports,
    loading,
  };
};

export const useStockTakeReports = (params = {}) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    inventoryService
      .stockTakeReports(params)
      .then((res) => { if (!cancelled) setData(res?.data || []); })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, isLoading };
};

export const useMyReceipts = (params = {}) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    inventoryService
      .getMyReceipts(params)
      .then((res) => { if (!cancelled) setData(res?.data || []); })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, isLoading };
};

export const useReceiptDetail = (id) => {
  const [state, setState] = useState({ data: null, isLoading: true, isError: false });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState({ data: null, isLoading: true, isError: false });
    inventoryService
      .getReceiptDetail(id)
      .then((res) => {
        if (!cancelled) setState({ data: res?.data || null, isLoading: false, isError: false });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, isLoading: false, isError: true });
      });
    return () => { cancelled = true; };
  }, [id]);

  return state;
};

export const useStockTakeDetail = (id) => {
  const [state, setState] = useState({ data: null, isLoading: true, isError: false });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState({ data: null, isLoading: true, isError: false });
    inventoryService
      .getStockTakeDetail(id)
      .then((res) => {
        if (!cancelled) setState({ data: res?.data || null, isLoading: false, isError: false });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, isLoading: false, isError: true });
      });
    return () => { cancelled = true; };
  }, [id]);

  return state;
};
