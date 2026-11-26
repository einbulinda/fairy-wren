import { useEffect, useState } from "react";
import api from "@/api";

// Owner setting (ERP → Accounting → M-Pesa). Cached for 5 minutes per session;
// the API enforces it regardless, this only hides the typed M-Pesa input.
const TTL_MS = 5 * 60 * 1000;
let cached = { value: false, at: 0 };
let inflight = null;

const load = () => {
  if (Date.now() - cached.at < TTL_MS) return Promise.resolve(cached.value);
  if (!inflight) {
    inflight = api
      .get("/settings")
      .then(({ data }) => {
        cached = { value: data?.data?.mpesa_require_ipn === "true", at: Date.now() };
        return cached.value;
      })
      .catch(() => cached.value) // keep last known value; API still enforces
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

/** true when M-Pesa must be matched to a KCB notification (no typed amounts). */
export const useRequireIpn = () => {
  const [requireIpn, setRequireIpn] = useState(cached.value);
  useEffect(() => {
    let alive = true;
    load().then((v) => alive && setRequireIpn(v));
    return () => {
      alive = false;
    };
  }, []);
  return requireIpn;
};
