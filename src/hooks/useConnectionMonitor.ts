import { useState, useEffect, useRef } from "react";

/**
 * Online/offline holatini kuzatadi.
 * `wasOffline` — aloqa yangi tiklangandan keyin 5 soniya davomida `true`.
 */
export function useConnectionMonitor() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setWasOffline(false), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Mount paytida holat o'zgargan bo'lishi mumkin (event o'tkazib yuborilgan)
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      // BUG FIX: avval `setTimeout` tozalanmasdi — unmount'dan keyin
      // setState chaqirilardi (leak).
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { isOnline, wasOffline };
}
