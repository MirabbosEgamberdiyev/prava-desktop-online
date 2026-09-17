import React, { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Radio,
  Badge,
  Box,
  Paper,
  Loader,
} from "@mantine/core";
import {
  IconWorld,
  IconExternalLink,
  IconBrowserCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export interface InstalledBrowser {
  id: string;
  name: string;
  icon: string;
  path: string;
  is_default: boolean;
}

interface OAuthBrowserModalProps {
  opened: boolean;
  onClose: () => void;
  onSelectBrowser: (browser: InstalledBrowser) => void;
  onOpenInternalWindow: () => void;
  loading?: boolean;
}

// Crisp official vector icons for major browsers
const BrowserIcon: React.FC<{ icon: string; size?: number }> = ({ icon, size = 28 }) => {
  switch (icon) {
    case "chrome":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="#4285F4" />
          <path
            d="M24 4c8.8 0 16.3 5.7 18.9 13.7H24v-6.3h-6.3L13.1 7.8C16.3 5.4 20 4 24 4z"
            fill="#EA4335"
          />
          <path
            d="M42.9 17.7C43.6 19.7 44 21.8 44 24c0 11-9 20-20 20-4.1 0-7.9-1.2-11.1-3.3l5.5-9.5c1.7 1.8 4 2.8 6.6 2.8 4.7 0 8.7-3.2 9.8-7.5h8.1z"
            fill="#34A853"
          />
          <path
            d="M13.1 7.8L7.6 17.3C5.3 21.2 4 22.5 4 24c0 9.8 7.1 17.9 16.5 19.7l5.5-9.5C21.7 33.7 18 30.3 18 24c0-2.3.8-4.4 2.1-6.1L13.1 7.8z"
            fill="#FBBC05"
          />
          <circle cx="24" cy="24" r="8.5" fill="#ffffff" />
          <circle cx="24" cy="24" r="7" fill="#1a73e8" />
        </svg>
      );
    case "edge":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48">
          <path
            fill="#0c84c6"
            d="M23.9 4.2C13.2 4.2 4.5 12.9 4.5 23.6c0 5 1.9 9.5 5 12.9 1.1-4.8 4.5-8.8 9.3-10.4-1.2-1.4-1.9-3.2-1.9-5.1 0-4.4 3.6-8 8-8 1.4 0 2.7.4 3.8 1 2.3-5.8 7.8-9.8 14.2-9.8.7 0 1.4.1 2.1.2-3.2-4.9-8.7-8.2-15-8.2z"
          />
          <path
            fill="#1fb25a"
            d="M43.5 23.6c0 1.7-.2 3.3-.6 4.9-2.7-1.7-6-2.5-9.5-2.2-4.8.4-8.8 3.5-10.4 7.9-1 2.7-.9 5.6.3 8.1C18.1 43.4 12 39.8 8.1 34.3c3.6 2.4 8 3.5 12.6 3.1 6.5-.6 11.8-5.3 13.1-11.7.5-2.4.2-4.8-.8-7 6.1 0 10.5 4.9 10.5 4.9z"
          />
        </svg>
      );
    case "firefox":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="19" fill="#ff7139" />
          <path
            fill="#00539f"
            d="M24 8c8.8 0 16 7.2 16 16s-7.2 16-16 16S8 32.8 8 24 15.2 8 24 8z"
          />
          <path
            fill="#ff9400"
            d="M34 16c0 6-5 11-11 11s-9-4-9-9 4-10 10-10c5 0 10 3 10 8z"
          />
          <path
            fill="#ffcb00"
            d="M28 14c0 3-2 6-6 6s-5-2-5-5 2-5 5-5 6 1 6 4z"
          />
        </svg>
      );
    case "brave":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48">
          <path
            fill="#fb542b"
            d="M24 4l12 7v14c0 9.2-6.5 17.1-12 19-5.5-1.9-12-9.8-12-19V11l12-7z"
          />
          <path
            fill="#ffffff"
            d="M24 12l6 4v7c0 4.6-3.3 8.6-6 9.5-2.7-.9-6-4.9-6-9.5v-7l6-4z"
          />
        </svg>
      );
    case "opera":
      return (
        <svg width={size} height={size} viewBox="0 0 48 48">
          <path
            fill="#ff1b2d"
            d="M24 5C13.5 5 5 13.5 5 24s8.5 19 19 19 19-8.5 19-19S34.5 5 24 5zm0 31.4c-6 0-10.9-5.6-10.9-12.4S18 11.6 24 11.6s10.9 5.6 10.9 12.4S30 36.4 24 36.4z"
          />
        </svg>
      );
    default:
      return <IconWorld size={size} color="#0284c7" />;
  }
};

export const OAuthBrowserModal: React.FC<OAuthBrowserModalProps> = ({
  opened,
  onClose,
  onSelectBrowser,
  onOpenInternalWindow,
  loading = false,
}) => {
  const { i18n } = useTranslation();
  const [browsers, setBrowsers] = useState<InstalledBrowser[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [fetching, setFetching] = useState(true);

  const lang = i18n.language;

  const tTitle =
    lang === "ru"
      ? "Выберите браузер для входа"
      : lang === "uzc"
      ? "Кириш учун браузерни танланг"
      : "Kirish uchun brauzerni tanlang";

  const tSubtitle =
    lang === "ru"
      ? "Google аккаунт с сохранением паролей и авторизацией безопаснее открывать в привычном браузере:"
      : lang === "uzc"
      ? "Google аккаунтингиз орқали хавфсиз кириш учун қурилмангиздаги мавжуд браузерни танланг:"
      : "Google akkauntingiz orqali xavfsiz kirish uchun qurilmangizdagi mavjud brauzerni tanlang:";

  const tDefaultBadge =
    lang === "ru" ? "По умолчанию" : lang === "uzc" ? "Асосий" : "Asosiy";

  const tContinue =
    lang === "ru" ? "Продолжить" : lang === "uzc" ? "Давом этиш" : "Davom etish";

  const tCancel =
    lang === "ru" ? "Отмена" : lang === "uzc" ? "Бекор қилиш" : "Bekor qilish";

  const tInternal =
    lang === "ru"
      ? "Открыть во встроенном окне"
      : lang === "uzc"
      ? "Ички ойнада очиш"
      : "Ichki oynada ochish";

  const tScanning =
    lang === "ru"
      ? "Поиск установленных браузеров..."
      : lang === "uzc"
      ? "Ўрнатилган браузерлар қидирилмоқда..."
      : "O'rnatilgan brauzerlar qidirilmoqda...";

  const tNoBrowsers =
    lang === "ru"
      ? "Установленные браузеры не найдены. Будет использован системный браузер."
      : lang === "uzc"
      ? "Ўрнатилган браузерлар топилмади. Тизим браузери ишлатилади."
      : "O'rnatilgan brauzerlar aniqlanmadi. Tizimning asosiy brauzeri ishlatiladi.";

  useEffect(() => {
    if (!opened) return;

    let mounted = true;
    setFetching(true);

    const loadBrowsers = async () => {
      try {
        const isTauri =
          typeof window !== "undefined" &&
          Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

        if (isTauri) {
          const { invoke } = await import("@tauri-apps/api/core");
          const list: InstalledBrowser[] = await invoke("get_installed_browsers");

          if (mounted) {
            setBrowsers(list);
            const defaultB = list.find((b) => b.is_default) || list[0];
            if (defaultB) {
              setSelectedId(defaultB.id);
            }
          }
        } else {
          if (mounted) {
            setBrowsers([]);
          }
        }
      } catch {
        if (mounted) {
          setBrowsers([]);
        }
      } finally {
        if (mounted) {
          setFetching(false);
        }
      }
    };

    loadBrowsers();

    return () => {
      mounted = false;
    };
  }, [opened]);

  const handleContinue = () => {
    const selected = browsers.find((b) => b.id === selectedId);
    if (selected) {
      onSelectBrowser(selected);
    } else if (browsers.length > 0) {
      onSelectBrowser(browsers[0]);
    } else {
      onSelectBrowser({
        id: "default",
        name: "Default Browser",
        icon: "world",
        path: "",
        is_default: true,
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Box
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: "rgba(66, 133, 244, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BrowserIcon icon="chrome" size={20} />
          </Box>
          <Text fw={700} fz={16}>
            {tTitle}
          </Text>
        </Group>
      }
      centered
      radius="xl"
      size="md"
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 4,
      }}
      styles={{
        header: {
          padding: "18px 24px 12px 24px",
          borderBottom: "1px solid var(--border)",
        },
        body: {
          padding: "20px 24px 24px 24px",
        },
      }}
    >
      <Stack gap={18}>
        <Text fz={13.5} c="dimmed" style={{ lineHeight: 1.45 }}>
          {tSubtitle}
        </Text>

        {fetching ? (
          <Group justify="center" py={24} gap="sm">
            <Loader size="sm" color="#0284c7" />
            <Text fz={13.5} c="dimmed">
              {tScanning}
            </Text>
          </Group>
        ) : browsers.length === 0 ? (
          <Paper
            withBorder
            p="md"
            radius="md"
            style={{ backgroundColor: "var(--surface-muted)" }}
          >
            <Group gap="sm">
              <IconAlertCircle size={20} color="#0284c7" />
              <Text fz={13} style={{ flex: 1 }}>
                {tNoBrowsers}
              </Text>
            </Group>
          </Paper>
        ) : (
          <Radio.Group
            value={selectedId}
            onChange={(val) => setSelectedId(val)}
          >
            <Stack gap={10}>
              {browsers.map((b) => {
                const isSelected = selectedId === b.id;
                return (
                  <Paper
                    key={b.id}
                    withBorder
                    p="sm"
                    radius="lg"
                    onClick={() => setSelectedId(b.id)}
                    style={{
                      cursor: "pointer",
                      transition: "all 0.16s ease",
                      borderColor: isSelected
                        ? "#0284c7"
                        : "var(--border)",
                      borderWidth: isSelected ? 2 : 1,
                      backgroundColor: isSelected
                        ? "rgba(2, 132, 199, 0.05)"
                        : "var(--surface)",
                      boxShadow: isSelected
                        ? "0 2px 10px rgba(2, 132, 199, 0.12)"
                        : "none",
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap={12} wrap="nowrap">
                        <BrowserIcon icon={b.icon} size={28} />
                        <Box>
                          <Group gap={6} wrap="nowrap">
                            <Text fw={700} fz={14.5} c="var(--text)">
                              {b.name}
                            </Text>
                            {b.is_default && (
                              <Badge
                                size="xs"
                                variant="light"
                                color="blue"
                                radius="sm"
                              >
                                {tDefaultBadge}
                              </Badge>
                            )}
                          </Group>
                          <Text fz={11.5} c="dimmed" lineClamp={1} maw={260}>
                            {b.path}
                          </Text>
                        </Box>
                      </Group>

                      <Radio
                        value={b.id}
                        color="blue"
                        styles={{ radio: { cursor: "pointer" } }}
                      />
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          </Radio.Group>
        )}

        <Group justify="space-between" pt={8} wrap="nowrap">
          <Button
            variant="subtle"
            color="gray"
            radius="md"
            onClick={onOpenInternalWindow}
            leftSection={<IconBrowserCheck size={16} />}
            fz={13}
            styles={{ root: { padding: "0 10px" } }}
          >
            {tInternal}
          </Button>

          <Group gap={8}>
            <Button
              variant="default"
              radius="md"
              onClick={onClose}
              fz={13.5}
            >
              {tCancel}
            </Button>
            <Button
              color="blue"
              radius="md"
              onClick={handleContinue}
              loading={loading}
              leftSection={<IconExternalLink size={16} />}
              fz={13.5}
              style={{ fontWeight: 600 }}
            >
              {tContinue}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};

export default OAuthBrowserModal;
