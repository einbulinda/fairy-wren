import { useState, useEffect } from "react";
import { exchangesService } from "../services/exchanges.service";

export const useAllExchanges = (params = {}) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const key = JSON.stringify(params);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    exchangesService
      .getAllExchanges(params)
      .then((res) => { if (!cancelled) setData(res?.data || []); })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, isLoading };
};

export const useExchangeDetail = (id) => {
  const [state, setState] = useState({ data: null, isLoading: true, isError: false });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState({ data: null, isLoading: true, isError: false });
    exchangesService
      .getExchangeDetail(id)
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
