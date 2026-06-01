import { useTheme } from "../ThemeContext";
import { IconMoon, IconSun } from "@tabler/icons-react";
import "./ThemeToggle.css";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button className="theme-toggle" onClick={toggleTheme} title={theme === "light" ? "Dark mode" : "Light mode"}>
      {theme === "light"
        ? <IconMoon size={18} stroke={2} />
        : <IconSun size={18} stroke={2} />}
    </button>
  );
}
