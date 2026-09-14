import { useState, useEffect } from "react";
import { Button, Tooltip } from "@mantine/core";
import { IconRefresh, IconWifiOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { syncEngine, type SyncState } from "../../sync/syncEngine";
import { networkHeartbeat } from "../../sync/networkHeartbeat";

export function SyncButton() {
  const { t } = useTranslation();
  const [syncState, setSyncState] = useState<SyncState>("IDLE");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    setIsOnline(networkHeartbeat.getStatus().isOnline);
    setSyncState(syncEngine.getState());

    const unsubHeartbeat = networkHeartbeat.subscribe((online) => {
      setIsOnline(online);
    });

    const handleSyncStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.state) setSyncState(detail.state);
      if (detail?.isRunning !== undefined) setIsSyncing(detail.isRunning);
    };

    window.addEventListener("sync-status-changed", handleSyncStatus);
    return () => {
      unsubHeartbeat();
      window.removeEventListener("sync-status-changed", handleSyncStatus);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncEngine.triggerSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const getTooltipLabel = () => {
    if (!isOnline) return t("sync.offline", { defaultValue: "Oflayn rejim (Internet yo'q)" });
    if (isSyncing) return t("sync.syncing", { defaultValue: "Server bilan sinxronlanmoqda..." });
    if (syncState === "ERROR") return t("sync.error", { defaultValue: "Sinxronlashda xatolik. Qayta urinish uchun bosing." });
    return t("sync.refresh", { defaultValue: "Server bilan sinxronlash (Yangilash)" });
  };

  return (
    <Tooltip label={getTooltipLabel()} withArrow position="bottom">
      <Button
        size="xs"
        variant={isSyncing ? "filled" : "light"}
        color={!isOnline ? "gray" : syncState === "ERROR" ? "red" : "blue"}
        radius="md"
        loading={isSyncing}
        leftSection={!isOnline ? <IconWifiOff size={14} /> : <IconRefresh size={14} />}
        onClick={handleManualSync}
        style={{ fontWeight: 600 }}
      >
        {t("common.sync_btn", { defaultValue: "Yangilash" })}
      </Button>
    </Tooltip>
  );
}

export default SyncButton;
