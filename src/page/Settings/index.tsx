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
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import { useAuth } from "../../auth/AuthContext";
import { AccountManager, type StoredAccount } from "../../auth/accountManager";
import { syncEngine, type SyncState } from "../../sync/syncEngine";
import { networkHeartbeat } from "../../sync/networkHeartbeat";
import { ProfileInfoCard } from "../../features/me/components/ProfileInfoCard";
import { ChangePasswordForm } from "../../features/me/components/ChangePasswordForm";
import SEO from "../../components/common/SEO";

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
  const { user } = useAuth();

  const { data: deviceResponse, isLoading: devicesLoading } = useSWR<{
    data: DeviceInfo;
  }>("/api/v2/my-statistics/devices");

  const deviceInfo = deviceResponse?.data;

  // Multi-account and Sync state for Desktop
  const [savedAccounts, setSavedAccounts] = useState<StoredAccount[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<SyncState>("IDLE");
  const [syncing, setSyncing] = useState<boolean>(false);

  useEffect(() => {
    setSavedAccounts(AccountManager.getSavedAccounts());
    setIsOnline(networkHeartbeat.getStatus().isOnline);
    setSyncState(syncEngine.getState());

    const unsubHeartbeat = networkHeartbeat.subscribe((online) => {
      setIsOnline(online);
    });

    const handleSyncStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.state) setSyncState(detail.state);
      if (detail?.isRunning !== undefined) setSyncing(detail.isRunning);
    };

    window.addEventListener("sync-status-changed", handleSyncStatus);

    return () => {
      unsubHeartbeat();
      window.removeEventListener("sync-status-changed", handleSyncStatus);
    };
  }, []);

  const handleSwitchAccount = (accountId: string | number) => {
    AccountManager.switchAccount(accountId);
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
        <main style={{ flex: 1, overflowY: "auto", padding: "14px 16px 32px" }}>
          <Container size="md">
            <Tabs defaultValue="profile">
              <Tabs.List mb="md">
                <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
                  {t("settings.profile", "Profil")}
                </Tabs.Tab>
                <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>
                  {t("settings.security", "Xavfsizlik")}
                </Tabs.Tab>
                <Tabs.Tab value="devices" leftSection={<IconDevices size={16} />}>
                  {t("settings.devices", "Qurilmalar")}
                </Tabs.Tab>
                <Tabs.Tab value="desktop" leftSection={<IconDeviceDesktop size={16} />}>
                  Desktop & Boshqaruv
                </Tabs.Tab>
              </Tabs.List>

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
                                {device.isCurrent && (
                                  <Badge size="sm" color="blue" variant="light">
                                    {t("settings.currentDevice", "Joriy qurilma")}
                                  </Badge>
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
                    </SimpleGrid>
                  </Paper>

                  {/* 2. Oflayn rejim va Sinxronizatsiya */}
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
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          Sinxron holati:
                        </Text>
                        <Badge variant="light" color={syncState === "SYNCING" ? "blue" : "gray"}>
                          {syncState}
                        </Badge>
                      </Group>
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconRefresh size={14} />}
                        loading={syncing}
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
                        Kompyuterdagi hisoblar (Multi-Account)
                      </Text>
                      <Badge variant="light">{savedAccounts.length} ta hisob saqlangan</Badge>
                    </Group>
                    <Text size="sm" c="dimmed" mb="md">
                      Bir nechta foydalanuvchi hisoblari o'rtasida parolni qayta kiritmasdan bir zumda almashing:
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
                                      {acc.fullName}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {acc.phone || acc.email || "ID: " + acc.id}
                                    </Text>
                                  </div>
                                </Group>
                                <Group gap="xs">
                                  {isCurrent ? (
                                    <Badge color="blue" variant="filled">
                                      Joriy hisob
                                    </Badge>
                                  ) : (
                                    <>
                                      <Button
                                        size="xs"
                                        variant="light"
                                        onClick={() => handleSwitchAccount(acc.id)}
                                      >
                                        Ushbu hisobga o‘tish
                                      </Button>
                                      <Button
                                        size="xs"
                                        color="red"
                                        variant="subtle"
                                        onClick={() => handleRemoveAccount(acc.id)}
                                      >
                                        <IconTrash size={14} />
                                      </Button>
                                    </>
                                  )}
                                </Group>
                              </Group>
                            </Paper>
                          );
                        })}
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed">
                        Boshqa saqlangan hisoblar mavjud emas.
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
