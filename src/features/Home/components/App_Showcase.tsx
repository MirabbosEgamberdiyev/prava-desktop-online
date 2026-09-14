import React from "react";
import { Box, SimpleGrid, Text, Title, Badge } from "@mantine/core";
import {
  IconBrandWindows,
  IconDeviceMobile,
  IconRefreshDot,
  IconDevices,
  IconCloudOff,
  IconWifi,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "./Home.module.css";

export const App_Showcase = React.memo(() => {
  const { t } = useTranslation();

  const devices = [
    {
      icon: IconBrandWindows,
      title: t("home.appShowcase.desktopTitle", "Prava Desktop (Windows)"),
      desc: t(
        "home.appShowcase.desktopDesc",
        "To'liq offline rejimda ishlaydigan mustaqil kompyuter dasturi. Internetsiz mashq qiling."
      ),
      badge: "OFFLINE READY",
      badgeColor: "blue",
      badgeIcon: IconCloudOff,
    },
    {
      icon: IconDeviceMobile,
      title: t("home.appShowcase.mobileTitle", "Mobil Ilova (Android & iOS)"),
      desc: t(
        "home.appShowcase.mobileDesc",
        "Jamoat transportida yoki navbatda telefoningizda qulay mashq qiling."
      ),
      badge: "PWA & APK",
      badgeColor: "green",
      badgeIcon: IconWifi,
    },
    {
      icon: IconRefreshDot,
      title: t("home.appShowcase.syncTitle", "Avtomatik Sinxronizatsiya"),
      desc: t(
        "home.appShowcase.syncDesc",
        "Bir qurilmada boshlagan biletingizni boshqa qurilmada bemalol davom ettirasiz."
      ),
      badge: "REAL-TIME CLOUD",
      badgeColor: "teal",
      badgeIcon: IconWifi,
    },
  ];

  return (
    <section className={classes.appShowcaseSection} aria-label="App Showcase">
      <Box className={classes.sectionTitle}>
        <div className={classes.sectionBadge}>
          <IconDevices size={14} />
          {t("home.appShowcase.badge", "Barcha Qurilmalarda")}
        </div>
        <Title order={2}>
          {t("home.appShowcase.title", "Istalgan joyda, istalgan vaqtda — hatto internetsiz")}
        </Title>
        <Text size="md" c="var(--text-muted)" mt="sm" maw={720} mx="auto" lh={1.6}>
          {t(
            "home.appShowcase.subtitle",
            "Uyda kompyuterda, yo'lda telefonda — o'qish jarayoni barcha qurilmalaringiz orasida bir zumda sinxronlashadi."
          )}
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mt={40}>
        {devices.map((device, idx) => (
          <div key={idx} className={classes.appDeviceCard}>
            <div
              className={classes.trustIcon}
              style={{ backgroundColor: "var(--primary-light)", color: "var(--primary)" }}
            >
              <device.icon size={26} stroke={1.8} />
            </div>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Badge
                size="xs"
                color={device.badgeColor}
                variant="light"
                mb={6}
                leftSection={<device.badgeIcon size={12} />}
              >
                {device.badge}
              </Badge>
              <Text fw={700} size="md" c="var(--text)" lh={1.3} mb={6}>
                {device.title}
              </Text>
              <Text size="sm" c="var(--text-muted)" lh={1.5}>
                {device.desc}
              </Text>
            </Box>
          </div>
        ))}
      </SimpleGrid>
    </section>
  );
});

App_Showcase.displayName = "App_Showcase";
