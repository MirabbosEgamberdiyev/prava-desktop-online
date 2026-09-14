import { Menu, Text, UnstyledButton } from "@mantine/core";
import { IconCheck, IconChevronDown, IconWorld } from "@tabler/icons-react";
import { useLanguage, APP_LANGUAGES, type AppLanguage } from "../../context/LanguageContext";

export const languages = APP_LANGUAGES.map((l) => ({
  value: l.code,
  label: l.label,
  short: l.short,
  code: l.flagCode,
}));

export default function LanguagePicker() {
  const { language, setLanguage, currentLanguageOption } = useLanguage();

  const handleLanguageChange = (value: AppLanguage) => {
    setLanguage(value);
  };

  return (
    <Menu shadow="md" width={190} position="bottom-end" radius="md" withinPortal>
      <Menu.Target>
        <UnstyledButton
          className="header-control-btn"
          aria-label={`Til: ${currentLanguageOption.label}`}
          title={currentLanguageOption.label}
        >
          <IconWorld
            size={16}
            stroke={1.6}
            style={{ color: "var(--primary)", flexShrink: 0 }}
            aria-hidden="true"
          />
          <span className="lang-label-full" style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.2px" }}>
            {currentLanguageOption.short}
          </span>
          <span className="lang-label-short" style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.2px" }}>
            {currentLanguageOption.flagCode}
          </span>
          <IconChevronDown
            size={13}
            style={{ opacity: 0.5, flexShrink: 0, color: "var(--text-muted)" }}
            aria-hidden="true"
          />
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown style={{ padding: 6 }}>
        {APP_LANGUAGES.map((lang) => {
          const isActive = language === lang.code;
          return (
            <Menu.Item
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              rightSection={
                isActive ? (
                  <IconCheck
                    size={14}
                    stroke={2.2}
                    style={{ color: "var(--primary)" }}
                  />
                ) : null
              }
              style={{
                fontWeight: isActive ? 600 : 500,
                backgroundColor: isActive ? "var(--primary-light)" : undefined,
                color: isActive ? "var(--primary)" : "var(--text)",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: "13px",
              }}
            >
              <Text size="sm" fw={isActive ? 600 : 500}>
                {lang.label}
              </Text>
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
