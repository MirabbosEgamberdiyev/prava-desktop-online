import { createContext, useContext, useEffect, useState } from "react";
import { useMantineColorScheme } from "@mantine/core";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function DesktopThemeProvider({ children }: { children: React.ReactNode }) {
  const { setColorScheme } = useMantineColorScheme();

  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("prava-theme") as Theme | null;
    if (saved === "dark" || saved === "light") {
      return saved;
    }
    // Auto-detect OS / Browser prefers-color-scheme
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-mantine-color-scheme", theme);
    try {
      setColorScheme(theme);
    } catch {
      // ignore
    }
    localStorage.setItem("prava-theme", theme);
  }, [theme, setColorScheme]);

  // Listen for OS system theme changes if user hasn't explicitly set in localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem("prava-theme");
      if (!saved) {
        setThemeState(e.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const toggleTheme = () => setThemeState((t) => (t === "light" ? "dark" : "light"));
  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useDesktopTheme = () => useContext(ThemeContext);
export default useDesktopTheme;
