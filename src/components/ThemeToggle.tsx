import { useTranslation } from "react-i18next";
import { useTheme } from "../ThemeContext";
import { IconMoon, IconSun } from "@tabler/icons-react";
import "./ThemeToggle.css";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === "light" ? t("common.darkMode") : t("common.lightMode")}
    >
      {theme === "light"
        ? <IconMoon size={18} stroke={2} />
        : <IconSun size={18} stroke={2} />}
    </button>
  );
}
