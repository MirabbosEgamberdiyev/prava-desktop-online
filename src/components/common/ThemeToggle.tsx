import { useDesktopTheme } from "../../context/DesktopThemeContext";
import { IconMoon, IconSun } from "@tabler/icons-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useDesktopTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === "light" ? "Dark mode" : "Light mode"}
      type="button"
      aria-label="Toggle Theme"
    >
      {theme === "light" ? (
        <IconMoon size={18} stroke={2} />
      ) : (
        <IconSun size={18} stroke={2} />
      )}
    </button>
  );
}
