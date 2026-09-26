import { useState, useEffect } from "react";
import {
  Stack,
  Tabs,
  Paper,
  Text,
  Group,
  Badge,
  Center,
  Loader,
  SimpleGrid,
  Container,
  Button,
  Kbd,
  SegmentedControl,
  Alert,
} from "@mantine/core";
import {
  IconUser,
  IconLock,
  IconDevices,
  IconDeviceMobile,
  IconDeviceDesktop,
  IconArrowLeft,
  IconSettings,
  IconKeyboard,
  IconRefresh,
  IconTrash,
  IconLogout,
  IconWifi,
  IconWifiOff,
  IconCloudUpload,
  IconInfoCircle,
  IconTypography,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import useSWR, { mutate } from "swr";
import { useAuth } from "../../auth/AuthContext";
import { AccountManager, type StoredAccount } from "../../auth/accountManager";
import { syncEngine, type SyncState } from "../../sync/syncEngine";
import { networkHeartbeat } from "../../sync/networkHeartbeat";
import { networkModeManager, type NetworkMode } from "../../sync/networkModeManager";
import { QrAuthService } from "../../api/qrAuthService";
import { showToast } from "../../utils/notificationUtils";
import { ProfileInfoCard } from "../../features/me/components/ProfileInfoCard";
import { ChangePasswordForm } from "../../features/me/components/ChangePasswordForm";
import SEO from "../../components/common/SEO";
import { SimpleTypographyControl } from "../../components/common/SimpleTypographyControl";

interface DeviceInfo {
  activeDevices?: number;
  currentDevices?: number;
  maxDevices: number;
  devices?: Array<{
    deviceId: string;
    deviceName: string;
    lastActiveAt: string;
    isCurrent: boolean;
  }>;
}

const Settings_Page = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";

  const { data: deviceResponse, isLoading: devicesLoading } = useSWR<{
    data: DeviceInfo;
  }>("/api/v2/my-statistics/devices");

  const deviceInfo = deviceResponse?.data;

  const [savedAccounts, setSavedAccounts] = useState<StoredAccount[]>([]);
  const [networkMode, setNetworkMode] = useState<NetworkMode>(networkModeManager.getMode());
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<SyncState>("IDLE");
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMetrics, setSyncMetrics] = useState<{
    pendingCount: number;
    localQuestionsCount: number;
    lastSyncAt: number | null;
  }>({
    pendingCount: 0,
    localQuestionsCount: 0,
    lastSyncAt: null,
  });

  const loadSyncMetrics = async () => {
    try {
      const metrics = await syncEngine.getSyncMetrics();
      setSyncMetrics({
        pendingCount: metrics.pendingCount,
        localQuestionsCount: metrics.localQuestionsCount,
        lastSyncAt: metrics.lastSyncAt,
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setSavedAccounts(AccountManager.getSavedAccounts());
    setIsOnline(networkHeartbeat.getStatus().isOnline);
    setSyncState(syncEngine.getState());
    setNetworkMode(networkModeManager.getMode());
    loadSyncMetrics();

    const unsubHeartbeat = networkHeartbeat.subscribe((online) => {
      setIsOnline(online);
      loadSyncMetrics();
    });

    const unsubMode = networkModeManager.subscribe((mode) => {
      setNetworkMode(mode);
    });

    const handleSyncStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.state) setSyncState(detail.state);
      if (detail?.isRunning !== undefined) setSyncing(detail.isRunning);
      loadSyncMetrics();
    };

    const handleStorageChanged = () => {
      loadSyncMetrics();
    };

    window.addEventListener("sync-status-changed", handleSyncStatus);
    window.addEventListener("prava-storage-changed", handleStorageChanged);

    return () => {
      unsubHeartbeat();
      unsubMode();
      window.removeEventListener("sync-status-changed", handleSyncStatus);
      window.removeEventListener("prava-storage-changed", handleStorageChanged);
    };
  }, []);

  const handleNetworkModeChange = (mode: NetworkMode) => {
    networkModeManager.setMode(mode);
    setNetworkMode(networkModeManager.getMode());
    if (mode !== "OFFLINE" && mode !== "OFFLINE_ONLY") {
      syncEngine.triggerSync().catch(() => {});
    }
  };

  const handleRevokeDevice = async (deviceId: string, deviceName: string) => {
    setRevokingDeviceId(deviceId);
    try {
      await QrAuthService.revokeDevice(deviceId);
      showToast({
        id: "device-revoke-success",
        dedupeKey: "device-revoke-success",
        title: "Sessiya tugatildi",
        message: `${deviceName} qurilmasi hisobdan muvaffaqiyatli uzildi.`,
        color: "teal",
        withBorder: true,
      });
      mutate("/api/v2/my-statistics/devices");
    } catch {
      showToast({
        id: "device-revoke-error",
        dedupeKey: "device-revoke-error",
        title: "Xatolik",
        message: "Qurilma sessiyasini tugatishda xatolik yuz berdi.",
        color: "red",
        withBorder: true,
      });
    } finally {
      setRevokingDeviceId(null);
    }
  };

  // Switching never reuses stored credentials: log out, then a normal login.
  const handleSwitchAccount = () => {
    logout({ redirectTo: "/auth/login" }).catch(() => {});
  };

  const handleRemoveAccount = (accountId: string | number) => {
    AccountManager.removeAccount(accountId);
    setSavedAccounts(AccountManager.getSavedAccounts());
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncEngine.triggerSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <SEO
        title="Sozlamalar"
        description="Profil sozlamalari, parol o'zgartirish va qurilmalarni boshqarish."
        canonical="/settings"
        noIndex={true}
      />
      <div className="review-screen">
        <header className="review-header">
          <button
            className="review-back-btn"
            onClick={() => navigate("/me")}
            type="button"
          >
            <IconArrowLeft size={18} stroke={2} />
            {t("common.back", "Orqaga")}
          </button>
          <div className="review-header-title">
            <IconSettings size={20} stroke={2} color="var(--mantine-color-blue-5)" />
            <span>{t("settings.title", "Sozlamalar va Profil")}</span>
          </div>
        </header>
        <main style={{ flex: 1, overflowY: "auto", padding: "0 16px 32px" }}>
          <Container size="md" pt="xs">
            <Tabs defaultValue={initialTab}>
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 20,
                  background: "var(--bg)",
                  paddingTop: "10px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--border)",
                  marginBottom: "20px",
                }}
              >
                <Tabs.List>
                  <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
                    {t("settings.profile", "Profil")}
                  </Tabs.Tab>
                  <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>
                    {t("settings.security", "Xavfsizlik")}
                  </Tabs.Tab>
                  <Tabs.Tab value="devices" leftSection={<IconDevices size={16} />}>
                    {t("settings.devices", "Qurilmalar")}
                  </Tabs.Tab>
                  <Tabs.Tab value="appearance" leftSection={<IconTypography size={16} />}>
                    {t("settings.appearance", "Ko'rinish")}
                  </Tabs.Tab>
                  <Tabs.Tab value="desktop" leftSection={<IconDeviceDesktop size={16} />}>
                    Desktop & Boshqaruv
                  </Tabs.Tab>
                </Tabs.List>
              </div>

              <Tabs.Panel value="profile">
                <Stack gap="lg">
                  <ProfileInfoCard />
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="security">
                <Stack gap="lg">
                  <ChangePasswordForm />
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="devices">
                <Stack gap="lg">
                  {devicesLoading && (
                    <Center py="xl">
                      <Loader size="sm" />
                    </Center>
                  )}

                  {deviceInfo && (
                    <>
                      <Paper p="lg" radius="md" withBorder shadow="sm">
                        <Group justify="space-between" mb="md">
                          <Text fw={600}>{t("settings.activeDevices", "Faol qurilmalar")}</Text>
                          <Badge size="lg" variant="light">
                            {(deviceInfo.activeDevices ?? deviceInfo.currentDevices ?? 1)}/{deviceInfo.maxDevices || 3}
                          </Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {t("settings.deviceLimitDesc", "Bir vaqtning o'zida bir nechta qurilmadan foydalanish")}
                        </Text>
                      </Paper>

                      {deviceInfo.devices && deviceInfo.devices.length > 0 && (
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                          {deviceInfo.devices.map((device) => (
                            <Paper
                              key={device.deviceId}
                              p="md"
                              radius="md"
                              withBorder
                              shadow="sm"
                              style={device.isCurrent ? { borderColor: "var(--mantine-color-blue-5)" } : undefined}
                            >
                              <Group justify="space-between">
                                <Group gap="sm">
                                  {device.deviceName.toLowerCase().includes("mobile") ? (
                                    <IconDeviceMobile size={20} />
                                  ) : (
                                    <IconDeviceDesktop size={20} />
                                  )}
                                  <div>
                                    <Text size="sm" fw={500}>
                                      {device.deviceName}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {new Date(device.lastActiveAt).toLocaleString()}
                                    </Text>
                                  </div>
                                </Group>
                                {device.isCurrent ? (
                                  <Badge size="sm" color="blue" variant="light">
                                    {t("settings.currentDevice", "Joriy qurilma")}
                                  </Badge>
                                ) : (
                                  <Button
                                    size="xs"
                                    color="red"
                                    variant="subtle"
                                    leftSection={<IconLogout size={14} />}
                                    loading={revokingDeviceId === device.deviceId}
                                    onClick={() => handleRevokeDevice(device.deviceId, device.deviceName)}
                                  >
                                    Sessiyani tugatish
                                  </Button>
                                )}
                              </Group>
                            </Paper>
                          ))}
                        </SimpleGrid>
                      )}
                    </>
                  )}

                  {!devicesLoading && !deviceInfo && (
                    <Paper p="xl" radius="md" withBorder ta="center">
                      <Text c="dimmed">{t("settings.noDeviceData", "Qurilmalar ma'lumoti mavjud emas")}</Text>
                    </Paper>
                  )}
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="appearance">
                <Stack gap="lg">
                  <SimpleTypographyControl />
                </Stack>
              </Tabs.Panel>

              {/* ── DESKTOP TAB ── */}
              <Tabs.Panel value="desktop">
                <Stack gap="lg">
                  {/* 1. Klaviatura qisqartmalari */}
                  <Paper p="lg" radius="md" withBorder shadow="sm">
                    <Group gap="xs" mb="sm">
                      <IconKeyboard size={20} color="var(--mantine-color-blue-5)" />
                      <Text fw={600} fz="md">
                        Tezkor klaviatura tugmalari (Keyboard Shortcuts)
                      </Text>
                    </Group>
                    <Text size="sm" c="dimmed" mb="md">
                      Imtihon va bilet yechish paytida sichqonchasiz, to'liq klaviatura yordamida ishlashingiz mumkin:
                    </Text>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      <Paper p="sm" withBorder radius="sm">
                        <Group justify="space-between">
                          <Text size="sm">Variant tanlash:</Text>
                          <Group gap={4}>
                            <Kbd>1</Kbd>–<Kbd>5</Kbd> yoki <Kbd>F1</Kbd>–<Kbd>F5</Kbd>
                          </Group>
                        </Group>
                      </Paper>

                      <Paper p="sm" withBorder radius="sm">
                        <Group justify="space-between">
                          <Text size="sm">Oldingi / Keyingi savol:</Text>
                          <Group gap={4}>
                            <Kbd>←</Kbd> <Kbd>→</Kbd>
                          </Group>
                        </Group>
                      </Paper>

                      <Paper p="sm" withBorder radius="sm">
                        <Group justify="space-between">
                          <Text size="sm">Keyingisiga o‘tish:</Text>
                          <Kbd>Space</Kbd>
                        </Group>
                      </Paper>

                      <Paper p="sm" withBorder radius="sm">
                        <Group justify="space-between">
                          <Text size="sm">Imtihonni yakunlash:</Text>
                          <Kbd>Enter</Kbd>
                        </Group>
                      </Paper>

                      <Paper p="sm" withBorder radius="sm">
                        <Group justify="space-between">
                          <Text size="sm">Modal / Rasmni yopish:</Text>
                          <Kbd>Esc</Kbd>
                        </Group>
                      </Paper>

                      <Paper p="sm" withBorder radius="sm">
                        <Group justify="space-between">
                          <Text size="sm">{t("search.shortcutLabel", "Global qidiruv")}:</Text>
                          <Group gap={4}>
                            <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>
                          </Group>
                        </Group>
                      </Paper>

                      <Paper p="sm" withBorder radius="sm">
                        <Group justify="space-between">
                          <Text size="sm">{t("search.pageSearchLabel", "Sahifa ichida qidirish")}:</Text>
                          <Group gap={4}>
                            <Kbd>Ctrl</Kbd>+<Kbd>F</Kbd> / <Kbd>/</Kbd>
                          </Group>
                        </Group>
                      </Paper>
                    </SimpleGrid>
                  </Paper>

                  {/* 2. Tarmoq Ish Rejimi (Network Mode) */}
                  <Paper p="lg" radius="md" withBorder shadow="sm">
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <IconWifi size={20} color="var(--mantine-color-blue-5)" />
                        <Text fw={600} fz="md">
                          Tarmoq Ish Rejimi (Network Mode)
                        </Text>
                      </Group>
                      <Badge
                        color={
                          networkMode === "ONLINE" || networkMode === "ONLINE_SYNC"
                            ? "blue"
                            : networkMode === "OFFLINE" || networkMode === "OFFLINE_ONLY"
                            ? "orange"
                            : "teal"
                        }
                        variant="light"
                      >
                        {networkMode === "ONLINE" || networkMode === "ONLINE_SYNC"
                          ? "Qat'iy Onlayn"
                          : networkMode === "OFFLINE" || networkMode === "OFFLINE_ONLY"
                          ? "Qat'iy Oflayn"
                          : "Avtomatik (Dynamic)"}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed" mb="md">
                      Qaysi rejim tanlanganidan qat'i nazar, barcha savollar va imtihonlar doimo kompyuteringizdagi mahalliy SQLite bazasidan 0 ms kechikish bilan ochiladi.
                    </Text>

                    <SegmentedControl
                      value={networkMode === "ONLINE_SYNC" ? "ONLINE" : networkMode === "OFFLINE_ONLY" ? "OFFLINE" : networkMode}
                      onChange={(val) => handleNetworkModeChange(val as NetworkMode)}
                      fullWidth
                      radius="md"
                      mb="md"
                      data={[
                        {
                          label: (
                            <Center style={{ gap: 6 }}>
                              <IconRefresh size={15} />
                              <span>Avtomatik (AUTO)</span>
                            </Center>
                          ),
                          value: "AUTO",
                        },
                        {
                          label: (
                            <Center style={{ gap: 6 }}>
                              <IconCloudUpload size={15} />
                              <span>Qat'iy Onlayn (ONLINE)</span>
                            </Center>
                          ),
                          value: "ONLINE",
                        },
                        {
                          label: (
                            <Center style={{ gap: 6 }}>
                              <IconWifiOff size={15} />
                              <span>Qat'iy Oflayn (OFFLINE)</span>
                            </Center>
                          ),
                          value: "OFFLINE",
                        },
                      ]}
                    />

                    <Alert
                      icon={<IconInfoCircle size={16} />}
                      color={networkMode === "OFFLINE" || networkMode === "OFFLINE_ONLY" ? "orange" : "blue"}
                      variant="light"
                      radius="md"
                    >
                      {networkMode === "AUTO" &&
                        "Avtomatik rejim: Tarmoq aloqasi avtomatik tekshirib turiladi. Internet bo'lganda yangilanishlar fonda sinxronlanadi, aloqa uzilganda esa hech qanday to'xtovsiz lokal bazadan foydalaniladi."}
                      {(networkMode === "ONLINE" || networkMode === "ONLINE_SYNC") &&
                        "Qat'iy Onlayn rejimi: Tarmoq bilan faol aloqa saqlanadi va bajarilgan har bir imtihon yoki o'zgarish serverga yuklanadi. Aloqa uzilsa, holat aniq ko'rsatiladi."}
                      {(networkMode === "OFFLINE" || networkMode === "OFFLINE_ONLY") &&
                        "Qat'iy Oflayn rejimi: Barcha tarmoq so'rovlari va fon pinglari to'xtatiladi, internet sarflanmaydi. Ilova 100% kompyuterdagi mahalliy SQLite bazasida ishlaydi. Internet tiklansa ham rejim oflayn qoladi."}
                    </Alert>
                  </Paper>

                  {/* 3. Oflayn ma'lumotlar va Sinxronizatsiya */}
                  <Paper p="lg" radius="md" withBorder shadow="sm">
                    <Group justify="space-between" mb="xs">
                      <Text fw={600} fz="md">
                        Oflayn ma'lumotlar va Sinxronizatsiya
                      </Text>
                      <Badge color={isOnline ? "green" : "orange"} variant="filled">
                        {isOnline ? "Tarmoqqa ulangan (Online)" : "Oflayn (Offline)"}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed" mb="md">
                      Barcha topshirilgan imtihonlar, saqlangan savollar va natijalar kompyuteringizdagi xavfsiz SQLite/IndexedDB bazasida saqlanadi va aloqa tiklanganda server bilan avtomatik sinxronlanadi.
                    </Text>

                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mb="md">
                      <Paper p="sm" withBorder radius="sm">
                        <Text size="xs" c="dimmed">
                          Lokal bazadagi savollar:
                        </Text>
                        <Text size="sm" fw={700}>
                          {syncMetrics.localQuestionsCount.toLocaleString()} ta savol
                        </Text>
                      </Paper>

                      <Paper p="sm" withBorder radius="sm">
                        <Text size="xs" c="dimmed">
                          Kutayotgan o‘zgarishlar (Outbox):
                        </Text>
                        <Text
                          size="sm"
                          fw={700}
                          c={syncMetrics.pendingCount > 0 ? "orange" : "green"}
                        >
                          {syncMetrics.pendingCount > 0
                            ? `${syncMetrics.pendingCount} ta so‘rov navbatda`
                            : "Barchasi sinxronlangan"}
                        </Text>
                      </Paper>

                      <Paper p="sm" withBorder radius="sm">
                        <Text size="xs" c="dimmed">
                          Oxirgi sinxronizatsiya:
                        </Text>
                        <Text size="sm" fw={700}>
                          {syncMetrics.lastSyncAt
                            ? new Date(syncMetrics.lastSyncAt).toLocaleTimeString()
                            : "Hali bajarilmagan"}
                        </Text>
                      </Paper>
                    </SimpleGrid>

                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          Sinxron holati:
                        </Text>
                        <Badge
                          variant="light"
                          color={
                            syncState === "SYNCING"
                              ? "blue"
                              : syncState === "OFFLINE"
                              ? "orange"
                              : syncState === "ERROR"
                              ? "red"
                              : "green"
                          }
                        >
                          {syncState === "SYNCING"
                            ? "Sinxronlanmoqda..."
                            : syncState === "OFFLINE"
                            ? "Oflayn"
                            : syncState === "ERROR"
                            ? "Xatolik"
                            : "Tayyor (IDLE)"}
                        </Badge>
                      </Group>
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconRefresh size={14} />}
                        loading={syncing}
                        disabled={!isOnline}
                        onClick={handleManualSync}
                      >
                        Hozir sinxronlash
                      </Button>
                    </Group>
                  </Paper>

                  {/* 3. Multi-Account boshqaruvi */}
                  <Paper p="lg" radius="md" withBorder shadow="sm">
                    <Group justify="space-between" mb="sm">
                      <Text fw={600} fz="md">
                        {t("settings.accounts.title")}
                      </Text>
                      <Badge variant="light">{t("settings.accounts.count", { count: savedAccounts.length })}</Badge>
                    </Group>
                    <Text size="sm" c="dimmed" mb="md">
                      {t("settings.accounts.description")}
                    </Text>

                    {savedAccounts.length > 0 ? (
                      <Stack gap="xs">
                        {savedAccounts.map((acc) => {
                          const isCurrent = user?.id && String(acc.id) === String(user.id);
                          return (
                            <Paper
                              key={acc.id}
                              p="sm"
                              withBorder
                              radius="md"
                              style={isCurrent ? { borderColor: "var(--mantine-color-blue-5)" } : undefined}
                            >
                              <Group justify="space-between">
                                <Group gap="sm">
                                  <IconUser size={18} color="var(--mantine-color-blue-6)" />
                                  <div>
                                    <Text size="sm" fw={600}>
                                      {acc.displayName || t("settings.accounts.unnamed")}
                                    </Text>
                                    {acc.maskedIdentifier ? (
                                      <Text size="xs" c="dimmed">
                                        {acc.maskedIdentifier}
                                      </Text>
                                    ) : null}
                                  </div>
                                </Group>
                                <Group gap="xs">
                                  {isCurrent ? (
                                    <Badge color="blue" variant="filled">
                                      {t("settings.accounts.current")}
                                    </Badge>
                                  ) : (
                                    <Button size="xs" variant="light" onClick={handleSwitchAccount}>
                                      {t("settings.accounts.switch")}
                                    </Button>
                                  )}
                                  <Button
                                    size="xs"
                                    color="red"
                                    variant="subtle"
                                    aria-label={t("settings.accounts.remove")}
                                    title={t("settings.accounts.remove")}
                                    onClick={() => handleRemoveAccount(acc.id)}
                                  >
                                    <IconTrash size={14} />
                                  </Button>
                                </Group>
                              </Group>
                            </Paper>
                          );
                        })}
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed">
                        {t("settings.accounts.empty")}
                      </Text>
                    )}
                  </Paper>
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Container>
        </main>
      </div>
    </>
  );
};

export default Settings_Page;
