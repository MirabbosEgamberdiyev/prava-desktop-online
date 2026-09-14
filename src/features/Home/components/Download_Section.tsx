import React from "react";
import { Box, SimpleGrid, Text, Title, Button, Group, Stack } from "@mantine/core";
import {
  IconDownload,
  IconBrandWindows,
  IconBrandGooglePlay,
  IconBrandApple,
  IconScan,
  IconExternalLink,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "../../../components/common/QRCodeSVG";
import classes from "./Home.module.css";

export const Download_Section = React.memo(() => {
  const { t } = useTranslation();
  const currentUrl = typeof window !== "undefined" ? window.location.origin + "/downloads" : "https://pravaonline.uz/downloads";

  return (
    <section className={classes.downloadSection} aria-label="Downloads">
      <div className={classes.downloadWrapper}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={40}>
          {/* Left Column: Information & Store buttons */}
          <div>
            <div className={classes.sectionBadge}>
              <IconDownload size={14} />
              {t("home.downloadSection.badge", "Yuklab Oling")}
            </div>
            <Title order={2} c="var(--text)">
              {t("home.downloadSection.title", "O'zingizga qulay formatda o'rnating")}
            </Title>
            <Text size="md" c="var(--text-muted)" mt="sm" mb="xl" lh={1.6}>
              {t(
                "home.downloadSection.subtitle",
                "Kompyuter va telefoningiz uchun eng so'nggi rasmiy versiyalar."
              )}
            </Text>

            <Stack gap="sm">
              <Link to="/downloads" style={{ textDecoration: "none" }}>
                <Button
                  fullWidth
                  size="md"
                  radius="md"
                  color="blue"
                  variant="filled"
                  leftSection={<IconBrandWindows size={20} />}
                  rightSection={<IconExternalLink size={16} />}
                >
                  {t("home.downloadSection.windowsApp", "Windows (Desktop offline)")}
                </Button>
              </Link>

              <SimpleGrid cols={{ base: 1, 360: 2 }} spacing="xs">
                <Link to="/downloads" style={{ textDecoration: "none" }}>
                  <Button
                    fullWidth
                    size="md"
                    radius="md"
                    variant="default"
                    leftSection={<IconBrandGooglePlay size={18} color="#00e676" />}
                  >
                    Google Play
                  </Button>
                </Link>

                <Link to="/downloads" style={{ textDecoration: "none" }}>
                  <Button
                    fullWidth
                    size="md"
                    radius="md"
                    variant="default"
                    leftSection={<IconBrandApple size={18} />}
                  >
                    App Store
                  </Button>
                </Link>
              </SimpleGrid>
            </Stack>
          </div>

          {/* Right Column: Dynamic QR Code */}
          <Box style={{ textAlign: "center" }}>
            <Box className={classes.qrContainer}>
              <QRCodeSVG
                value={currentUrl}
                size={160}
                bgColor="#ffffff"
                fgColor="#031824"
                level="Q"
              />
            </Box>
            <Group justify="center" gap="xs" mt="sm">
              <IconScan size={16} color="var(--primary)" />
              <Text size="xs" fw={600} c="var(--text-muted)" maw={240}>
                {t(
                  "home.downloadSection.qrScan",
                  "Kamerani QR-kodga yo'naltiring va ilovani yuklab oling"
                )}
              </Text>
            </Group>
          </Box>
        </SimpleGrid>
      </div>
    </section>
  );
});

Download_Section.displayName = "Download_Section";
