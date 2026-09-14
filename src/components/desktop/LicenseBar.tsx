import React from "react";
import { Badge, Button, Group, Tooltip } from "@mantine/core";
import { IconKey, IconRefresh, IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useLicense } from "./DesktopLicenseGuard";
import { isTauriApp } from "../../services/tauriLicense";

export const LicenseBar: React.FC = () => {
  const { t } = useTranslation();
  const { status, openRenewModal } = useLicense();

  if (!isTauriApp() || !status) return null;

  const days = Math.max(0, status.days_remaining ?? 0);
  const isExpiringSoon = days <= 7;
  const isExpired = status.is_expired || days === 0;

  const color = isExpired ? "red" : isExpiringSoon ? "orange" : "teal";

  return (
    <Group gap={6} wrap="nowrap">
      <Tooltip
        label={`${t("license.until", { defaultValue: "Tugaydi" })}: ${
          status.expires_at || "—"
        }`}
      >
        <Badge
          color={color}
          variant="light"
          size="md"
          radius="sm"
          leftSection={
            isExpired ? (
              <IconAlertTriangle size={13} />
            ) : (
              <IconKey size={13} />
            )
          }
          style={{ cursor: "pointer" }}
          onClick={openRenewModal}
        >
          {isExpired
            ? t("license.expired", { defaultValue: "Muddati tugagan" })
            : `${days} ${t("common.days", { defaultValue: "kun" })}`}
        </Badge>
      </Tooltip>

      <Button
        variant="subtle"
        color="gray"
        size="compact-xs"
        onClick={openRenewModal}
        title={t("license.renewTitle", {
          defaultValue: "Aktivatsiya kodini yangilash",
        })}
      >
        <IconRefresh size={13} />
      </Button>
    </Group>
  );
};
