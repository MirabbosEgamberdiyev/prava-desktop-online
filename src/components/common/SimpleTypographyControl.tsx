import { Paper, Stack, Text, Group, SegmentedControl, Switch, Box } from "@mantine/core";
import { IconTypography, IconBold } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useTypography, type TextSize } from "../../context/TypographyContext";

/** Settings → Appearance (ported from the web app). */
export function SimpleTypographyControl() {
  const { t } = useTranslation();
  const { textSize, setTextSize, boldText, setBoldText } = useTypography();

  return (
    <Paper p="lg" radius="md" withBorder shadow="sm">
      <Stack gap="md">
        <Group gap="xs">
          <IconTypography size={20} style={{ color: "var(--primary)" }} />
          <div>
            <Text fw={600} size="md">
              {t("settings.typographyTitle", "Matn va Ko'rinish")}
            </Text>
            <Text size="xs" c="dimmed">
              {t("settings.typographySubtitle", "")}
            </Text>
          </div>
        </Group>

        <div>
          <Text size="sm" fw={500} mb="xs">
            {t("settings.textSize", "Matn o'lchami")}
          </Text>
          <SegmentedControl
            fullWidth
            value={textSize}
            onChange={(val) => setTextSize(val as TextSize)}
            aria-label={t("settings.textSize", "Matn o'lchami")}
            data={[
              { label: t("settings.textSmall", "Kichik"), value: "small" },
              { label: t("settings.textStandard", "Standart"), value: "standard" },
              { label: t("settings.textLarge", "Katta"), value: "large" },
            ]}
          />
        </div>

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
  );
}

export default SimpleTypographyControl;
