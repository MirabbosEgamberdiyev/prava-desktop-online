import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LEGACY_TEXT_SIZE_KEY,
  UI_SCALE_KEY,
  parseUiScale,
  stepUiScale,
  type UiScale,
} from "../shell/zoom";

/**
 * Settings → Ko'rinish: UI scale (90 / 100 / 110 / 125 %) + bold text, persisted in localStorage.
 * Desktop: the scale uses the native WebView zoom (like Ctrl +/- in a browser) so the whole
 * px/rem UI scales and layouts reflow without CSS transforms (crisp text on high-DPI screens).
 * Plain browser (vite dev) falls back to the root font-size (rem-based text only).
 * Ctrl+= / Ctrl+- / Ctrl+0 are wired in src/shell/GlobalHotkeys.tsx.
 */
export const BOLD_TEXT_KEY = "prava-bold-text";

interface TypographyContextType {
  scale: UiScale;
  boldText: boolean;
  setScale: (scale: UiScale) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setBoldText: (bold: boolean) => void;
}

const TypographyContext = createContext<TypographyContextType>({
  scale: 1,
  boldText: false,
  setScale: () => {},
  zoomIn: () => {},
  zoomOut: () => {},
  resetZoom: () => {},
  setBoldText: () => {},
});

export function readUiScale(): UiScale {
  try {
    return parseUiScale(localStorage.getItem(UI_SCALE_KEY), localStorage.getItem(LEGACY_TEXT_SIZE_KEY));
  } catch {
    return 1;
  }
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
  const [scale, setScaleState] = useState<UiScale>(readUiScale);
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
    root.setAttribute("data-ui-scale", String(Math.round(scale * 100)));
    try {
      localStorage.setItem(UI_SCALE_KEY, String(scale));
      localStorage.removeItem(LEGACY_TEXT_SIZE_KEY);
    } catch {
      // ignore
    }
    // Optimistic: under Tauri the CSS root-font fallback must not stack on top of the zoom.
    if (isTauri()) root.setAttribute("data-native-zoom", "true");
    // No IPC at startup for the default scale (zoom is already 1).
    if (scale === zoomApplied.current) return;
    let alive = true;
    applyNativeZoom(scale).then((ok) => {
      if (ok) zoomApplied.current = scale;
      if (!alive) return;
      if (ok) root.setAttribute("data-native-zoom", "true");
      else root.removeAttribute("data-native-zoom");
    });
    return () => {
      alive = false;
    };
  }, [scale]);

  const setScale = useCallback((s: UiScale) => setScaleState(s), []);
  const zoomIn = useCallback(() => setScaleState((s) => stepUiScale(s, 1)), []);
  const zoomOut = useCallback(() => setScaleState((s) => stepUiScale(s, -1)), []);
  const resetZoom = useCallback(() => setScaleState(1), []);
  const setBoldText = useCallback((bold: boolean) => setBoldTextState(bold), []);

  const value = useMemo(
    () => ({ scale, boldText, setScale, zoomIn, zoomOut, resetZoom, setBoldText }),
    [scale, boldText, setScale, zoomIn, zoomOut, resetZoom, setBoldText],
  );
  return <TypographyContext.Provider value={value}>{children}</TypographyContext.Provider>;
}

export function useTypography() {
  return useContext(TypographyContext);
}
