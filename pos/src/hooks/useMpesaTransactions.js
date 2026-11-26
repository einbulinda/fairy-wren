import { useCallback, useEffect, useRef, useState } from "react";
import { MpesaService } from "@/services/mpesa.service";
import { useAppStore } from "@/store/app.store";

const POLL_MS = 30000; // fallback if the socket drops; live updates come via mpesaReloadTrigger

/**
 * Received KCB M-Pesa payments that still have money to match.
 * @param {{ billId?: string, status?: string, q?: string, from?: string, enabled?: boolean }} options
 *   billId → each item carries `match` for that bill, best match first.
 */
export const useMpesaTransactions = ({ billId, status = "open", q, from, enabled = true } = {}) => {
  const reloadTrigger = useAppStore((s) => s.mpesaReloadTrigger);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const data = await MpesaService.list(
        { status, ...(billId && { billId }), ...(q && { q }), ...(from && { from }) },
        { signal: controller.signal },
      );
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      if (err?.name === "CanceledError" || err?.name === "AbortError") return;
      setError(err);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [billId, status, q, from]);

  useEffect(() => {
    if (!enabled) return undefined;
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [enabled, load, reloadTrigger]);

  return { items, loading, error, reload: load };
};
