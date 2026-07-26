import { useTranslation } from "react-i18next";
import { useTheme } from "../ThemeContext";
import { IconMoon, IconSun } from "@tabler/icons-react";
import "./ThemeToggle.css";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  const label = theme === "light" ? t("common.darkMode") : t("common.lightMode");

  return (
    // type="button" muhim: bu tugma form ichidagi topbar'da ham ishlatiladi
    // (ForgotPassword/Login/Register), aks holda Enter bosilganda formani
    // yuborib yuborishi mumkin edi.
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      aria-pressed={theme === "dark"}
    >
      {theme === "light"
        ? <IconMoon size={18} stroke={2} />
        : <IconSun size={18} stroke={2} />}
    </button>
  );
}
