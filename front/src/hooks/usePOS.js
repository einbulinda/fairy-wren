import { useCallback, useEffect, useState } from "react";
import { bootstrapPOS } from "../services/pos.service";

export const useBootstrap = () => {
  const [posData, setPosData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await bootstrapPOS();
      setPosData(data);
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { posData, reload: loadData, loading, error };
};
