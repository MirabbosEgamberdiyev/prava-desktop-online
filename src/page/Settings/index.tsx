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
} from "@mantine/core";
import {
  IconUser,
  IconLock,
  IconDevices,
  IconDeviceMobile,
  IconDeviceDesktop,
  IconArrowLeft,
  IconSettings,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import { ProfileInfoCard } from "../../features/me/components/ProfileInfoCard";
import { ChangePasswordForm } from "../../features/me/components/ChangePasswordForm";
import SEO from "../../components/common/SEO";

interface DeviceInfo {
  currentDevices: number;
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

  const { data: deviceResponse, isLoading: devicesLoading } = useSWR<{
    data: DeviceInfo;
  }>("/api/v2/my-statistics/devices");

  const deviceInfo = deviceResponse?.data;

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
            {t("settings.profile")}
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>
            {t("settings.security")}
          </Tabs.Tab>
          <Tabs.Tab value="devices" leftSection={<IconDevices size={16} />}>
            {t("settings.devices")}
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
                    <Text fw={600}>{t("settings.activeDevices")}</Text>
                    <Badge size="lg" variant="light">
                      {deviceInfo.currentDevices}/{deviceInfo.maxDevices}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {t("settings.deviceLimitDesc")}
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
                              {t("settings.currentDevice")}
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
                <Text c="dimmed">{t("settings.noDeviceData")}</Text>
              </Paper>
            )}
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
