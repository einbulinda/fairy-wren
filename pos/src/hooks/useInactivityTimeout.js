import { useEffect, useRef } from "react";
import { TokenService } from "@/api/token.service";
import { INACTIVITY_TIMEOUT } from "@/api/constants";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"];
const THROTTLE_MS = 60 * 1000; // Throttle expiry resets to once per minute

export function useInactivityTimeout(onExpired) {
  const lastResetRef = useRef(0);

  useEffect(() => {
    if (!TokenService.getToken()) return;

    const resetExpiry = () => {
      const now = Date.now();
      if (now - lastResetRef.current < THROTTLE_MS) return;
      lastResetRef.current = now;
      TokenService.resetExpiry(INACTIVITY_TIMEOUT);
    };

    const checkExpiry = () => {
      if (TokenService.isExpired()) {
        onExpired();
      }
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetExpiry, { passive: true }),
    );

    const intervalId = setInterval(checkExpiry, 60 * 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetExpiry),
      );
      clearInterval(intervalId);
    };
  }, [onExpired]);
}
