import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMantineColorScheme } from "@mantine/core";

/** Resolved (applied) theme. */
export type Theme = "light" | "dark";
/** User preference (Settings → Ko'rinish). "system" follows the OS and reacts to changes live. */
export type ThemePreference = Theme | "system";

export const THEME_STORAGE_KEY = "prava-theme";

interface ThemeContextType {
  /** Applied theme (never "system"). */
  theme: Theme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  preference: "system",
  setPreference: () => {},
  toggleTheme: () => {},
  setTheme: () => {},
});

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light" || saved === "system") return saved;
  } catch {
    // ignore
  }
  // No stored value (first run) → follow the OS, as before.
  return "system";
}

function systemTheme(): Theme {
  return typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

export function DesktopThemeProvider({ children }: { children: React.ReactNode }) {
  const { setColorScheme } = useMantineColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [osTheme, setOsTheme] = useState<Theme>(systemTheme);

  const theme: Theme = preference === "system" ? osTheme : preference;

  // Follow OS changes only while the preference is "system" (no listener otherwise).
  useEffect(() => {
    if (preference !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(DARK_QUERY);
    setOsTheme(mq.matches ? "dark" : "light");
    const handler = (e: MediaQueryListEvent) => setOsTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-mantine-color-scheme", theme);
    root.style.colorScheme = theme;
    try {
      setColorScheme(theme);
    } catch {
      // ignore
    }
  }, [theme, setColorScheme]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // ignore
    }
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => setPreferenceState(p), []);
  const setTheme = useCallback((t: Theme) => setPreferenceState(t), []);
  const toggleTheme = useCallback(
    () => setPreferenceState((p) => ((p === "system" ? systemTheme() : p) === "light" ? "dark" : "light")),
    [],
  );

  const value = useMemo(
    () => ({ theme, preference, setPreference, toggleTheme, setTheme }),
    [theme, preference, setPreference, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useDesktopTheme = () => useContext(ThemeContext);
export default useDesktopTheme;
