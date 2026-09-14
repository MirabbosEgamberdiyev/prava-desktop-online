import { useState, useEffect } from "react";
import { Button, Menu, Group, Text, Badge, Stack, Box, Divider } from "@mantine/core";
import {
  IconRefresh,
  IconCloud,
  IconCloudOff,
  IconBolt,
  IconCheck,
  IconChevronDown,
  IconDatabase,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { syncEngine, type SyncState } from "../../sync/syncEngine";
import { networkHeartbeat } from "../../sync/networkHeartbeat";
import { networkModeManager, type NetworkMode } from "../../sync/networkModeManager";
import { OutboxQueue } from "../../sync/outboxQueue";

export interface NetworkModeSelectorProps {
  size?: "xs" | "sm" | "md";
}

export function NetworkModeSelector({ size = "xs" }: NetworkModeSelectorProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<NetworkMode>(() => networkModeManager.getMode());
  const [isOnline, setIsOnline] = useState<boolean>(() => networkHeartbeat.getStatus().isOnline);
  const [latencyMs, setLatencyMs] = useState<number | null>(() => networkHeartbeat.getStatus().latencyMs);
  const [syncState, setSyncState] = useState<SyncState>(() => syncEngine.getState());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1. Initial pending count
    const refreshPending = async () => {
      try {
        const pending = await OutboxQueue.getPending();
        if (mounted) setPendingCount(pending.length);
      } catch {
        // ignore
      }
    };
    refreshPending();

    // 2. Mode subscriber
    const unsubMode = networkModeManager.subscribe((newMode) => {
      if (mounted) setMode(newMode);
    });

    // 3. Heartbeat subscriber
    const unsubHeartbeat = networkHeartbeat.subscribe((online, latency) => {
      if (mounted) {
        setIsOnline(online);
        setLatencyMs(latency);
      }
    });

    // 4. Sync events
    const handleSyncStatus = (e: Event) => {
      if (!mounted) return;
      const detail = (e as CustomEvent).detail;
      if (detail?.state) setSyncState(detail.state);
      if (detail?.isRunning !== undefined) setIsSyncing(detail.isRunning);
      if (detail?.lastSyncAt !== undefined) setLastSyncAt(detail.lastSyncAt);
      refreshPending();
    };

    const handleStorageChange = () => {
      refreshPending();
    };

    window.addEventListener("sync-status-changed", handleSyncStatus);
    window.addEventListener("prava-storage-changed", handleStorageChange);

    return () => {
      mounted = false;
      unsubMode();
      unsubHeartbeat();
      window.removeEventListener("sync-status-changed", handleSyncStatus);
      window.removeEventListener("prava-storage-changed", handleStorageChange);
    };
  }, []);

  const handleModeChange = (newMode: NetworkMode) => {
    networkModeManager.setMode(newMode);
    setMode(networkModeManager.getMode());
    if (newMode !== "OFFLINE" && newMode !== "OFFLINE_ONLY") {
      syncEngine.triggerSync().catch(() => {});
    }
  };

  const handleManualSync = async () => {
    if (isSyncing || mode === "OFFLINE" || mode === "OFFLINE_ONLY" || !isOnline) return;
    setIsSyncing(true);
    try {
      await syncEngine.triggerSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const isOfflineMode = mode === "OFFLINE" || mode === "OFFLINE_ONLY";
  const isOnlineMode = mode === "ONLINE" || mode === "ONLINE_SYNC";
  const isAutoMode = mode === "AUTO";

  // ── Button Appearance Logic ──
  const getButtonConfig = () => {
    if (isSyncing) {
      return {
        label: t("sync.syncing", { defaultValue: "Sinxronlanmoqda..." }),
        color: "blue",
        variant: "filled" as const,
        icon: <IconRefresh size={14} style={{ animation: "spin 1s linear infinite" }} />,
      };
    }

    if (isOfflineMode) {
      return {
        label: t("mode.offline", { defaultValue: "Oflayn" }),
        color: "orange",
        variant: "light" as const,
        icon: <IconDatabase size={14} stroke={2} />,
      };
    }

    if (syncState === "ERROR" && isOnline) {
      return {
        label: t("mode.online", { defaultValue: "Onlayn" }),
        color: "blue",
        variant: "light" as const,
        icon: <IconCloud size={14} stroke={2} />,
      };
    }

    if (isOnlineMode) {
      if (isOnline) {
        return {
          label: t("mode.online", { defaultValue: "Onlayn" }),
          color: "blue",
          variant: "light" as const,
          icon: <IconCloud size={14} stroke={2} />,
        };
      }
      return {
        label: t("mode.noConnection", { defaultValue: "Aloqa yo'q" }),
        color: "red",
        variant: "light" as const,
        icon: <IconCloudOff size={14} stroke={2} />,
      };
    }

    // AUTO Mode
    if (isOnline) {
      return {
        label: t("mode.auto", { defaultValue: "Avto" }),
        color: "teal",
        variant: "light" as const,
        icon: <IconBolt size={14} stroke={2} />,
      };
    }

    return {
      label: t("mode.autoOffline", { defaultValue: "Avto (Oflayn)" }),
      color: "gray",
      variant: "light" as const,
      icon: <IconBolt size={14} stroke={2} />,
    };
  };

  const btn = getButtonConfig();

  const formatLastSync = () => {
    if (!lastSyncAt) return t("sync.neverSynced", { defaultValue: "Hali sinxronlanmagan" });
    const d = new Date(lastSyncAt);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <Menu shadow="lg" width={290} position="bottom-end" radius="md" withArrow>
      <Menu.Target>
        <Button
          size={size}
          variant={btn.variant}
          color={btn.color}
          radius="md"
          loading={isSyncing}
          leftSection={btn.icon}
          rightSection={
            <Group gap={4} wrap="nowrap">
              {pendingCount > 0 && (
                <Badge size="xs" color="orange" variant="filled" circle style={{ height: 16, minWidth: 16, padding: "0 4px" }}>
                  {pendingCount}
                </Badge>
              )}
              <IconChevronDown size={12} stroke={2.5} />
            </Group>
          }
          style={{
            fontWeight: 600,
            transition: "all 0.15s ease",
            boxShadow: mode === "OFFLINE" ? "0 1px 4px rgba(247, 103, 7, 0.2)" : undefined,
          }}
        >
          {btn.label}
        </Button>
      </Menu.Target>

      <Menu.Dropdown p="xs">
        {/* ── 1. Tarmoq va Holat ── */}
        <Box px={6} py={4}>
          <Group justify="space-between" mb={4} wrap="nowrap">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
              {t("mode.networkTitle", { defaultValue: "Tarmoq Holati" })}
            </Text>
            <Badge
              size="xs"
              variant="dot"
              color={isOfflineMode ? "orange" : isOnline ? "teal" : "red"}
            >
              {isOfflineMode
                ? t("mode.offlineModeActive", { defaultValue: "Faqat Oflayn" })
                : isOnline
                ? latencyMs
                  ? `${latencyMs} ms`
                  : t("mode.connected", { defaultValue: "Ulangan" })
                : t("mode.disconnected", { defaultValue: "Aloqa yo'q" })}
            </Badge>
          </Group>

          <Text size="xs" c={pendingCount > 0 ? "orange" : "dimmed"}>
            {pendingCount > 0
              ? t("mode.pendingChanges", {
                  defaultValue: `${pendingCount} ta amal zaxirada (navbatda)`,
                  count: pendingCount,
                })
              : t("mode.allSynced", { defaultValue: "Barcha ma'lumotlar saqlangan" })}
          </Text>
        </Box>

        <Divider my={6} />

        {/* ── 2. Ish Rejimini Tanlash ── */}
        <Menu.Label>{t("mode.selectWorkMode", { defaultValue: "Ish Rejimi" })}</Menu.Label>

        {/* AUTO MODE */}
        <Menu.Item
          leftSection={<IconBolt size={16} color="var(--mantine-color-teal-6)" />}
          rightSection={isAutoMode ? <IconCheck size={16} color="var(--mantine-color-teal-6)" stroke={2.5} /> : null}
          onClick={() => handleModeChange("AUTO")}
          style={{ borderRadius: 6 }}
        >
          <Stack gap={1}>
            <Group gap={6} wrap="nowrap">
              <Text size="xs" fw={600}>
                {t("mode.autoTitle", { defaultValue: "Avtomatik" })}
              </Text>
              <Badge size="xs" variant="light" color="teal">
                {t("common.recommended", { defaultValue: "Tavsiya" })}
              </Badge>
            </Group>
            <Text size="11px" c="dimmed" lineClamp={1}>
              {t("mode.autoDesc", { defaultValue: "Tarmoqqa qarab avtomatik moslashadi" })}
            </Text>
          </Stack>
        </Menu.Item>

        {/* ONLINE MODE */}
        <Menu.Item
          leftSection={<IconCloud size={16} color="var(--mantine-color-blue-6)" />}
          rightSection={isOnlineMode ? <IconCheck size={16} color="var(--mantine-color-blue-6)" stroke={2.5} /> : null}
          onClick={() => handleModeChange("ONLINE")}
          style={{ borderRadius: 6 }}
        >
          <Stack gap={1}>
            <Text size="xs" fw={600}>
              {t("mode.onlineTitle", { defaultValue: "Qat'iy Onlayn" })}
            </Text>
            <Text size="11px" c="dimmed" lineClamp={1}>
              {t("mode.onlineDesc", { defaultValue: "Server bilan doimiy real-vaqt sinxron" })}
            </Text>
          </Stack>
        </Menu.Item>

        {/* OFFLINE MODE */}
        <Menu.Item
          leftSection={<IconDatabase size={16} color="var(--mantine-color-orange-6)" />}
          rightSection={isOfflineMode ? <IconCheck size={16} color="var(--mantine-color-orange-6)" stroke={2.5} /> : null}
          onClick={() => handleModeChange("OFFLINE")}
          style={{ borderRadius: 6 }}
        >
          <Stack gap={1}>
            <Text size="xs" fw={600}>
              {t("mode.offlineTitle", { defaultValue: "Qat'iy Oflayn" })}
            </Text>
            <Text size="11px" c="dimmed" lineClamp={1}>
              {t("mode.offlineDesc", { defaultValue: "Faqat mahalliy SQLite, internet sarflanmaydi" })}
            </Text>
          </Stack>
        </Menu.Item>

        <Divider my={6} />

        {/* ── 3. Sinxronlash Amali ── */}
        {isOfflineMode ? (
          <Box px={8} py={4}>
            <Text size="11px" c="dimmed" ta="center">
              {t("mode.offlineSyncNotice", {
                defaultValue: "Oflayn rejimda server bilan aloqa to'xtatilgan. Amallar qurilmangizda saqlanmoqda.",
              })}
            </Text>
          </Box>
        ) : (
          <Box px={4} py={2}>
            <Menu.Item
              leftSection={
                <IconRefresh
                  size={15}
                  style={isSyncing ? { animation: "spin 1s linear infinite" } : undefined}
                />
              }
              disabled={!isOnline || isSyncing}
              onClick={handleManualSync}
              style={{ borderRadius: 6 }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Text size="xs" fw={600}>
                  {t("sync.manualSync", { defaultValue: "Hozir sinxronlash" })}
                </Text>
                <Text size="10px" c="dimmed">
                  {lastSyncAt ? formatLastSync() : ""}
                </Text>
              </Group>
            </Menu.Item>
          </Box>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

export default NetworkModeSelector;
