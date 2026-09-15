import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
  ThemeIcon,
} from "@mantine/core";
import { IconCheck, IconArrowRight } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useLanguage, type AppLanguage } from "../../../context/LanguageContext";

// Prava Steering Wheel Vector Logo
function SteeringWheelLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" stroke="#ffffff" strokeWidth="3" />
      <circle cx="24" cy="24" r="7" stroke="#ffffff" strokeWidth="3" />
      <path d="M24 4V17M24 31V44M4 24H17M31 24H44" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function LanguageSelectionPage() {
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AppLanguage>(language || "uzl");

  const languages: { code: AppLanguage; flag: string; label: string }[] = [
    { code: "uzl", flag: "🇺🇿", label: "O‘zbekcha (UZL)" },
    { code: "uzc", flag: "🇺🇿", label: "Ўзбекча (UZC)" },
    { code: "ru", flag: "🇷🇺", label: "Русский (RU)" },
  ];

  const handleContinue = async () => {
    await setLanguage(selected);
    localStorage.setItem("prava_lang_selected", "true");
    navigate("/auth/login", { replace: true });
  };

  return (
    <Container size={440} py={40}>
      <Card
        withBorder
        shadow="md"
        radius={24}
        p={32}
        style={{
          backgroundColor: "var(--card-bg, #ffffff)",
          borderColor: "var(--border, #e2e8f0)",
          boxShadow: "0 12px 36px rgba(10, 37, 64, 0.08)",
          textAlign: "center",
        }}
      >
        <Stack align="center" gap={16}>
          {/* Brand Squircle Logo */}
          <Box
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              backgroundColor: "#0284c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(2, 132, 199, 0.35)",
            }}
          >
            <SteeringWheelLogo size={36} />
          </Box>

          <Box>
            <Title order={2} fw={800} fz={24} style={{ letterSpacing: "-0.02em" }}>
              {selected === "ru"
                ? "Выберите язык"
                : selected === "uzc"
                ? "Тилни танланг"
                : "Tilni tanlang"}
            </Title>
            <Text c="dimmed" fz={13.5} mt={4}>
              {selected === "ru"
                ? "Выберите язык для использования приложения"
                : selected === "uzc"
                ? "Иловадан фойдаланиш учун тилни танланг"
                : "Ilovadan foydalanish uchun tilni tanlang"}
            </Text>
          </Box>

          {/* Language Options List */}
          <Stack gap={10} style={{ width: "100%" }} mt={8}>
            {languages.map((item) => {
              const isSelected = selected === item.code;
              return (
                <Card
                  key={item.code}
                  withBorder
                  p={14}
                  radius={16}
                  onClick={() => setSelected(item.code)}
                  style={{
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    backgroundColor: isSelected
                      ? "rgba(2, 132, 199, 0.06)"
                      : "var(--surface, #f8fafc)",
                    borderColor: isSelected ? "#0284c7" : "var(--border, #e2e8f0)",
                    borderWidth: isSelected ? 2 : 1,
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap={12}>
                      <Text fz={20}>{item.flag}</Text>
                      <Text fw={isSelected ? 700 : 500} fz={14.5}>
                        {item.label}
                      </Text>
                    </Group>
                    {isSelected ? (
                      <ThemeIcon size={24} radius="xl" color="#0284c7">
                        <IconCheck size={15} stroke={2.5} />
                      </ThemeIcon>
                    ) : (
                      <Text c="dimmed" fz={16}>
                        ›
                      </Text>
                    )}
                  </Group>
                </Card>
              );
            })}
          </Stack>

          {/* Primary Continue Button */}
          <Button
            fullWidth
            size="md"
            radius={14}
            color="#0284c7"
            h={48}
            mt={12}
            rightSection={<IconArrowRight size={18} />}
            onClick={handleContinue}
            style={{
              fontWeight: 700,
              fontSize: 15,
              boxShadow: "0 6px 16px rgba(2, 132, 199, 0.28)",
            }}
          >
            {selected === "ru"
              ? "Продолжить"
              : selected === "uzc"
              ? "Давом этиш"
              : "Davom etish"}
          </Button>
        </Stack>
      </Card>
    </Container>
  );
}
