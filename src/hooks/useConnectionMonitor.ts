import { useState, useEffect, useRef } from "react";
import { networkHeartbeat } from "../sync/networkHeartbeat";

/**
 * Online/offline holatini dual-tier networkHeartbeat orqali kuzatadi.
 * `wasOffline` — aloqa yangi tiklangandan keyin 4 soniya davomida `true`.
 */
export function useConnectionMonitor() {
  const [isOnline, setIsOnline] = useState(() => networkHeartbeat.getStatus().isOnline);
  const [wasOffline, setWasOffline] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let hadOfflinePeriod = false;

    const unsubscribe = networkHeartbeat.subscribe((online) => {
      setIsOnline(online);
      if (!online) {
        hadOfflinePeriod = true;
        setWasOffline(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (hadOfflinePeriod) {
        setWasOffline(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setWasOffline(false);
          hadOfflinePeriod = false;
        }, 4000);
      }
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { isOnline, wasOffline };
}
