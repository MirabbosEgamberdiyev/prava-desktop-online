import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALLED_KEY = "pwa_installed";

/**
 * Detect if the app is running in standalone (PWA) mode.
 */
function getIsStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as Record<string, unknown>).standalone === true
  );
}

/**
 * Detect if the PWA was previously installed (localStorage flag or standalone).
 */
function getIsInstalled(): boolean {
  if (getIsStandalone()) return true;
  try {
    return localStorage.getItem(INSTALLED_KEY) === "true";
  } catch {
    return false;
  }
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(getIsInstalled);
  const [isStandalone, setIsStandalone] = useState(getIsStandalone);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Standalone mode = running inside the PWA
    const standalone = getIsStandalone();
    setIsStandalone(standalone);

    if (standalone) {
      setIsInstalled(true);
      try {
        localStorage.setItem(INSTALLED_KEY, "true");
      } catch { /* ignore */ }
      return;
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Listen for install prompt (Chrome/Edge/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for app installed event
    const installedHandler = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(INSTALLED_KEY, "true");
      } catch { /* ignore */ }
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
      try {
        localStorage.setItem(INSTALLED_KEY, "true");
      } catch { /* ignore */ }
    }

    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome === "accepted";
  }, [deferredPrompt]);

  /**
   * Open the installed PWA. On most browsers, navigating to start_url
   * with the PWA installed will open it in standalone mode.
   */
  const openApp = useCallback(() => {
    // Navigate to start_url — browser will open installed PWA
    window.location.href = "/";
  }, []);

  return { isInstallable, isInstalled, isStandalone, isIOS, install, openApp };
}
