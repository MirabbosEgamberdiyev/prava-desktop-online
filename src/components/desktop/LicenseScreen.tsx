import React, { useState, useEffect } from "react";
import {
  Card,
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Group,
  Alert,
  Badge,
  Code,
  ActionIcon,
  Tooltip,
  Paper,
  Divider,
} from "@mantine/core";
import {
  IconKey,
  IconCopy,
  IconCheck,
  IconAlertCircle,
  IconShieldCheck,
  IconRefresh,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  getMachineId,
  activateLicense,
  type LicenseStatus,
} from "../../services/tauriLicense";

interface Props {
  currentStatus: LicenseStatus | null;
  onActivated: (status: LicenseStatus) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const LicenseScreen: React.FC<Props> = ({
  currentStatus,
  onActivated,
  onClose,
  isModal = false,
}) => {
  const { t } = useTranslation();
  const [machineId, setMachineId] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    getMachineId()
      .then(setMachineId)
      .catch((e) => console.warn("[LicenseScreen] getMachineId failed:", e));
  }, []);

  const handleCopyMachineId = () => {
    if (!machineId) return;
    navigator.clipboard.writeText(machineId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError(
        t("license.enterCode", {
          defaultValue: "Iltimos, aktivatsiya kodini kiriting",
        })
      );
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const status = await activateLicense(trimmed);
      if (status.is_valid && !status.is_expired) {
        setSuccessMsg(
          t("license.success", {
            defaultValue: "Litsenziya muvaffaqiyatli faollashtirildi!",
          })
        );
        onActivated(status);
        if (onClose) {
          setTimeout(onClose, 1000);
        }
      } else {
        setError(
          t("license.invalidCode", {
            defaultValue: "Aktivatsiya kodi noto'g'ri yoki muddati o'tgan",
          })
        );
      }
    } catch (err) {
      const msg =
        typeof err === "string"
          ? err
          : err instanceof Error
          ? err.message
          : t("license.errorUnknown", {
              defaultValue: "Aktivatsiya xatosi yuz berdi",
            });
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <Card
      withBorder
      shadow="xl"
      radius="lg"
      p="xl"
      style={{
        maxWidth: 540,
        width: "100%",
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #1971c2, #228be6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <IconKey size={24} />
            </div>
            <div>
              <Title order={3} style={{ fontWeight: 700, fontSize: "1.25rem" }}>
                {t("license.title", { defaultValue: "Dastur Litsenziyasi" })}
              </Title>
              <Text size="xs" c="dimmed">
                Prava Online Desktop v2.0
              </Text>
            </div>
          </Group>

          {currentStatus?.is_valid && !currentStatus.is_expired ? (
            <Badge color="green" variant="light" size="lg" leftSection={<IconShieldCheck size={14} />}>
              {t("license.active", { defaultValue: "Faol" })}
            </Badge>
          ) : (
            <Badge color="red" variant="light" size="lg" leftSection={<IconAlertCircle size={14} />}>
              {t("license.inactive", { defaultValue: "Faol emas" })}
            </Badge>
          )}
        </Group>

        <Divider />

        {currentStatus?.is_valid && !currentStatus.is_expired && (
          <Paper p="sm" radius="md" withBorder style={{ background: "rgba(34, 197, 94, 0.06)", borderColor: "rgba(34, 197, 94, 0.3)" }}>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed">
                  {t("license.daysLeft", { defaultValue: "Qolgan kunlar:" })}
                </Text>
                <Text fw={700} size="md" c="green">
                  {currentStatus.days_remaining} {t("common.days", { defaultValue: "kun" })}
                </Text>
              </div>
              <div style={{ textAlign: "right" }}>
                <Text size="xs" c="dimmed">
                  {t("license.expiresAt", { defaultValue: "Amal qilish muddati:" })}
                </Text>
                <Text fw={600} size="xs">
                  {currentStatus.expires_at}
                </Text>
              </div>
            </Group>
          </Paper>
        )}

        <div>
          <Text size="xs" fw={600} mb={4} c="dimmed">
            {t("license.machineId", { defaultValue: "Kompyuter ID (Machine ID):" })}
          </Text>
          <Paper
            p="xs"
            radius="md"
            withBorder
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--input-bg, rgba(0,0,0,0.04))",
            }}
          >
            <Code
              style={{
                fontSize: "0.8rem",
                background: "transparent",
                wordBreak: "break-all",
                maxHeight: 60,
                overflowY: "auto",
              }}
            >
              {machineId || t("common.loading", { defaultValue: "Yuklanmoqda..." })}
            </Code>
            <Tooltip label={copied ? t("common.copied", { defaultValue: "Nusxalandi!" }) : t("common.copy", { defaultValue: "Nusxa olish" })}>
              <ActionIcon
                variant="subtle"
                color={copied ? "teal" : "blue"}
                onClick={handleCopyMachineId}
              >
                {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
              </ActionIcon>
            </Tooltip>
          </Paper>
          <Text size="xs" c="dimmed" mt={4}>
            {t("license.machineIdNote", {
              defaultValue:
                "Litsenziya kalitini olish uchun ushbu Machine ID ni administratorga yuboring.",
            })}
          </Text>
        </div>

        <form onSubmit={handleActivate}>
          <Stack gap="xs">
            <TextInput
              label={t("license.inputLabel", {
                defaultValue: "Aktivatsiya kodi",
              })}
              placeholder="XXXX-XXXX-XXXX-XXXX..."
              value={code}
              onChange={(e) => setCode(e.currentTarget.value)}
              disabled={loading}
              autoFocus
              required
            />

            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
                title={t("common.error", { defaultValue: "Xatolik" })}
              >
                {error}
              </Alert>
            )}

            {successMsg && (
              <Alert
                icon={<IconCheck size={16} />}
                color="teal"
                variant="light"
                title={t("common.success", { defaultValue: "Muvaffaqiyatli" })}
              >
                {successMsg}
              </Alert>
            )}

            <Group justify="flex-end" mt="sm">
              {isModal && onClose && (
                <Button variant="default" onClick={onClose} disabled={loading}>
                  {t("common.cancel", { defaultValue: "Bekor qilish" })}
                </Button>
              )}
              <Button
                type="submit"
                loading={loading}
                leftSection={<IconRefresh size={16} />}
                style={{
                  background: "linear-gradient(135deg, #1971c2, #228be6)",
                }}
              >
                {t("license.activateButton", { defaultValue: "Faollashtirish" })}
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Card>
  );

  if (isModal) {
    return content;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "1rem",
      }}
    >
      {content}
    </div>
  );
};
