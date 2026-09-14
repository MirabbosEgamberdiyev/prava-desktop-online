import { Tooltip, UnstyledButton } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { useDesktopTheme } from "@/context/DesktopThemeContext";
import { useTranslation } from "react-i18next";

const ColorMode = () => {
  const { theme, toggleTheme } = useDesktopTheme();
  const { t } = useTranslation();
  const isLight = theme === "light";

  return (
    <Tooltip
      label={isLight ? t("common.darkMode", "Qorong'u rejim") : t("common.lightMode", "Yorug' rejim")}
      position="bottom"
      withArrow
    >
      <UnstyledButton
        onClick={toggleTheme}
        className="header-control-icon-btn"
        aria-label={isLight ? "Dark mode ga o'tish" : "Light mode ga o'tish"}
        type="button"
      >
        {isLight ? (
          <IconMoon stroke={1.8} size={18} style={{ color: "var(--text)" }} />
        ) : (
          <IconSun stroke={1.8} size={18} style={{ color: "#ffd43b" }} />
        )}
      </UnstyledButton>
    </Tooltip>
  );
};

export default ColorMode;
