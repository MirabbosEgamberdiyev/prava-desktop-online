import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Settings → Appearance: text size + bold text (web TypographyContext parity), persisted in
 * localStorage. Desktop: text size uses the native WebView zoom (like Ctrl +/- in a browser) so
 * the whole px-based UI scales and layouts reflow; plain browser (vite dev) falls back to the
 * web approach (root font-size, affects rem-based Mantine text).
 */
export type TextSize = "small" | "standard" | "large";

export const TEXT_SIZE_SCALE: Record<TextSize, number> = { small: 0.92, standard: 1, large: 1.12 };
export const TEXT_SIZE_KEY = "prava-text-size";
export const BOLD_TEXT_KEY = "prava-bold-text";

interface TypographyContextType {
  textSize: TextSize;
  boldText: boolean;
  setTextSize: (size: TextSize) => void;
  setBoldText: (bold: boolean) => void;
}

const TypographyContext = createContext<TypographyContextType>({
  textSize: "standard",
  boldText: false,
  setTextSize: () => {},
  setBoldText: () => {},
});

export function readTextSize(): TextSize {
  try {
    const v = localStorage.getItem(TEXT_SIZE_KEY);
    if (v === "small" || v === "standard" || v === "large") return v;
  } catch {
    // ignore
  }
  return "standard";
}

function readBold(): boolean {
  try {
    return localStorage.getItem(BOLD_TEXT_KEY) === "true";
  } catch {
    return false;
  }
}

const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function applyNativeZoom(scale: number): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
    await getCurrentWebview().setZoom(scale);
    return true;
  } catch {
    return false;
  }
}

export function TypographyProvider({ children }: { children: ReactNode }) {
  const [textSize, setTextSize] = useState<TextSize>(readTextSize);
  const [boldText, setBoldTextState] = useState<boolean>(readBold);
  const zoomApplied = useRef<number>(1);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-bold-text", String(boldText));
    try {
      localStorage.setItem(BOLD_TEXT_KEY, String(boldText));
    } catch {
      // ignore
    }
  }, [boldText]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-text-size", textSize);
    try {
      localStorage.setItem(TEXT_SIZE_KEY, textSize);
    } catch {
      // ignore
    }
    const scale = TEXT_SIZE_SCALE[textSize];
    // Optimistic: under Tauri the CSS root-font fallback must not stack on top of the zoom.
    if (isTauri()) root.setAttribute("data-native-zoom", "true");
    // No IPC at startup for the default size (zoom is already 1).
    if (scale === zoomApplied.current) return;
    let alive = true;
    applyNativeZoom(scale).then((ok) => {
      if (!alive) return;
      if (ok) {
        zoomApplied.current = scale;
        root.setAttribute("data-native-zoom", "true");
      } else {
        root.removeAttribute("data-native-zoom");
      }
    });
    return () => {
      alive = false;
    };
  }, [textSize]);

  const setBoldText = useCallback((bold: boolean) => setBoldTextState(bold), []);

  const value = useMemo(() => ({ textSize, boldText, setTextSize, setBoldText }), [textSize, boldText, setBoldText]);
  return <TypographyContext.Provider value={value}>{children}</TypographyContext.Provider>;
}

export function useTypography() {
  return useContext(TypographyContext);
}
