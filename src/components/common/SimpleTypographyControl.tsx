import type { ReactNode } from "react";
import { Paper, Stack, Text, Group, SegmentedControl, Switch, Box, Center } from "@mantine/core";
import { IconBold, IconDeviceDesktop, IconMoon, IconPalette, IconSun, IconZoomIn } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useTypography } from "../../context/TypographyContext";
import { useDesktopTheme, type ThemePreference } from "../../context/DesktopThemeContext";
import { UI_SCALE_STEPS, formatUiScale, type UiScale } from "../../shell/zoom";

/** Settings → Ko'rinish: theme (Light / Dark / System), UI scale (90–125 %), bold text. */
export function SimpleTypographyControl() {
  const { t } = useTranslation();
  const { scale, setScale, boldText, setBoldText } = useTypography();
  const { preference, setPreference } = useDesktopTheme();

  const themeOption = (value: ThemePreference, icon: ReactNode, label: string) => ({
    value,
    label: (
      <Center style={{ gap: 6 }}>
        {icon}
        <span>{label}</span>
      </Center>
    ),
  });

  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Group gap="xs">
            <IconPalette size={18} style={{ color: "var(--primary)" }} />
            <div>
              <Text fw={600} size="sm">
                {t("desktopShell.settings.themeTitle", "Mavzu")}
              </Text>
              <Text size="xs" c="dimmed">
                {t("desktopShell.settings.themeDesc", "Tizim — Windows sozlamasiga avtomatik ergashadi")}
              </Text>
            </div>
          </Group>
          <SegmentedControl
            fullWidth
            value={preference}
            onChange={(v) => setPreference(v as ThemePreference)}
            aria-label={t("desktopShell.settings.themeTitle", "Mavzu")}
            data={[
              themeOption("light", <IconSun size={15} />, t("desktopShell.settings.themeLight", "Yorug'")),
              themeOption("dark", <IconMoon size={15} />, t("desktopShell.settings.themeDark", "Qorong'u")),
              themeOption("system", <IconDeviceDesktop size={15} />, t("desktopShell.settings.themeSystem", "Tizim")),
            ]}
          />
        </Stack>
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Group gap="xs">
            <IconZoomIn size={18} style={{ color: "var(--primary)" }} />
            <div>
              <Text fw={600} size="sm">
                {t("desktopShell.settings.scaleTitle", "Masshtab")}
              </Text>
              <Text size="xs" c="dimmed">
                {t("desktopShell.settings.scaleDesc", "Butun interfeys o'lchami (Ctrl+= / Ctrl+- / Ctrl+0)")}
              </Text>
            </div>
          </Group>
          <SegmentedControl
            fullWidth
            value={String(scale)}
            onChange={(v) => setScale(Number(v) as UiScale)}
            aria-label={t("desktopShell.settings.scaleTitle", "Masshtab")}
            data={UI_SCALE_STEPS.map((s) => ({ value: String(s), label: formatUiScale(s) }))}
          />

          <Group justify="space-between" align="center" pt="xs" wrap="nowrap">
            <div>
              <Group gap="xs">
                <IconBold size={16} style={{ color: "var(--primary)" }} />
                <Text size="sm" fw={500}>
                  {t("settings.boldText", "Qalin matn")}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {t("settings.boldTextDesc", "O'qish qulayligi uchun barcha matnlarni qalinroq ko'rsatish")}
              </Text>
            </div>
            <Switch
              size="md"
              checked={boldText}
              onChange={(e) => setBoldText(e.currentTarget.checked)}
              aria-label={t("settings.boldText", "Qalin matn")}
            />
          </Group>

          <Box
            p="sm"
            style={{
              background: "var(--surface-muted)",
              borderRadius: 8,
              border: "1px dashed var(--border)",
            }}
          >
            <Text size="xs" c="dimmed" mb={4}>
              {t("settings.previewLabel", "Namuna ko'rinishi:")}
            </Text>
            <Text size="sm">
              {t("settings.previewText", "Yo'l harakati qoidalari va rasmiy imtihon biletlari bilan muvaffaqiyatli tayyorlaning.")}
            </Text>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}

export default SimpleTypographyControl;
