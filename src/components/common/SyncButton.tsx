import { useState, useEffect } from "react";
import { Button, Menu, Group, Text, Badge } from "@mantine/core";
import {
  IconRefresh,
  IconWifiOff,
  IconCloudUpload,
  IconCheck,
  IconChevronDown,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { syncEngine, type SyncState } from "../../sync/syncEngine";
import { networkHeartbeat } from "../../sync/networkHeartbeat";
import { networkModeManager, type NetworkMode } from "../../sync/networkModeManager";

export function SyncButton() {
  const { t } = useTranslation();
  const [syncState, setSyncState] = useState<SyncState>("IDLE");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [networkMode, setNetworkMode] = useState<NetworkMode>(networkModeManager.getMode());

  useEffect(() => {
    setIsOnline(networkHeartbeat.getStatus().isOnline);
    setSyncState(syncEngine.getState());
    setNetworkMode(networkModeManager.getMode());

    const unsubHeartbeat = networkHeartbeat.subscribe((online) => {
      setIsOnline(online);
    });

    const unsubMode = networkModeManager.subscribe((mode) => {
      setNetworkMode(mode);
    });

    const handleSyncStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.state) setSyncState(detail.state);
      if (detail?.isRunning !== undefined) setIsSyncing(detail.isRunning);
    };

    window.addEventListener("sync-status-changed", handleSyncStatus);
    return () => {
      unsubHeartbeat();
      unsubMode();
      window.removeEventListener("sync-status-changed", handleSyncStatus);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing || networkMode === "OFFLINE_ONLY") return;
    setIsSyncing(true);
    try {
      await syncEngine.triggerSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleModeChange = (mode: NetworkMode) => {
    networkModeManager.setMode(mode);
    setNetworkMode(mode);
    if (mode !== "OFFLINE_ONLY") {
      syncEngine.triggerSync().catch(() => {});
    }
  };

  const getButtonLabel = () => {
    if (isSyncing) return "Sinxronlanmoqda...";
    if (networkMode === "OFFLINE_ONLY") return "Faqat Oflayn";
    if (!isOnline) return "Oflayn";
    return t("common.sync_btn", { defaultValue: "Sinxronlash" });
  };

  const getButtonColor = () => {
    if (networkMode === "OFFLINE_ONLY") return "orange";
    if (!isOnline) return "gray";
    if (syncState === "ERROR") return "red";
    if (isSyncing) return "blue";
    return "teal";
  };

  return (
    <Menu shadow="md" width={220} position="bottom-end" radius="md">
      <Menu.Target>
        <Button
          size="xs"
          variant={isSyncing ? "filled" : "light"}
          color={getButtonColor()}
          radius="md"
          loading={isSyncing}
          leftSection={
            networkMode === "OFFLINE_ONLY" || !isOnline ? (
              <IconWifiOff size={14} />
            ) : (
              <IconRefresh size={14} />
            )
          }
          rightSection={<IconChevronDown size={12} />}
          style={{ fontWeight: 600 }}
        >
          {getButtonLabel()}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Tarmoq va Sinxronizatsiya</Menu.Label>

        <Menu.Item
          leftSection={<IconRefresh size={14} />}
          disabled={networkMode === "OFFLINE_ONLY" || !isOnline || isSyncing}
          onClick={handleManualSync}
        >
          Hozir sinxronlash
        </Menu.Item>

        <Menu.Divider />

        <Menu.Label>Ish Rejimi</Menu.Label>

        <Menu.Item
          leftSection={<IconRefresh size={14} />}
          rightSection={networkMode === "AUTO" ? <IconCheck size={14} color="teal" /> : null}
          onClick={() => handleModeChange("AUTO")}
        >
          <Group justify="space-between" wrap="nowrap">
            <Text size="xs">Avtomatik (AUTO)</Text>
            {networkMode === "AUTO" && (
              <Badge size="xs" color="teal" variant="light">
                Faol
              </Badge>
            )}
          </Group>
        </Menu.Item>

        <Menu.Item
          leftSection={<IconCloudUpload size={14} />}
          rightSection={
            networkMode === "ONLINE_SYNC" ? <IconCheck size={14} color="blue" /> : null
          }
          onClick={() => handleModeChange("ONLINE_SYNC")}
        >
          <Group justify="space-between" wrap="nowrap">
            <Text size="xs">Onlayn Sinxron</Text>
            {networkMode === "ONLINE_SYNC" && (
              <Badge size="xs" color="blue" variant="light">
                Faol
              </Badge>
            )}
          </Group>
        </Menu.Item>

        <Menu.Item
          leftSection={<IconWifiOff size={14} />}
          rightSection={
            networkMode === "OFFLINE_ONLY" ? <IconCheck size={14} color="orange" /> : null
          }
          onClick={() => handleModeChange("OFFLINE_ONLY")}
        >
          <Group justify="space-between" wrap="nowrap">
            <Text size="xs">Faqat Oflayn</Text>
            {networkMode === "OFFLINE_ONLY" && (
              <Badge size="xs" color="orange" variant="light">
                Faol
              </Badge>
            )}
          </Group>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export default SyncButton;
