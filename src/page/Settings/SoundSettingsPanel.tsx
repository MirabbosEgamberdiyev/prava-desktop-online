import { useSyncExternalStore, useState } from "react";
import { Paper, Slider, Stack, Switch, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  getSfxEnabled,
  getSfxVolume,
  playSfx,
  setSfxEnabled,
  setSfxVolume,
  subscribeSfx,
} from "../../services/sound";
import { getTtsAuto, isTtsSupported, setTtsAuto } from "../../services/tts";

/** Sozlamalar → Tovush: imtihon tovush effektlari va savollarni ovozli o'qish. */
export default function SoundSettingsPanel() {
  const { t } = useTranslation();
  const sfxEnabled = useSyncExternalStore(subscribeSfx, getSfxEnabled, getSfxEnabled);
  const volume = useSyncExternalStore(subscribeSfx, getSfxVolume, getSfxVolume);
  const [ttsAuto, setTtsAutoState] = useState(getTtsAuto);
  const ttsSupported = isTtsSupported();

  return (
    <Paper withBorder p="lg" radius="md">
      <Stack gap="md">
        <Title order={4}>{t("examDesktop.settings.soundTitle", "Tovush va ovoz")}</Title>

        <Switch
          checked={sfxEnabled}
          onChange={(e) => {
            setSfxEnabled(e.currentTarget.checked);
            if (e.currentTarget.checked) playSfx("correct");
          }}
          label={t("examDesktop.settings.sfx", "Tovush effektlari (to'g'ri / noto'g'ri / taymer)")}
          description={t("examDesktop.settings.sfxHint", "Imtihon paytida M tugmasi bilan tezda o'chirish mumkin")}
        />

        <div>
          <Text size="sm" mb={6}>{t("examDesktop.settings.volume", "Balandlik")}</Text>
          <Slider
            value={Math.round(volume * 100)}
            onChange={(v) => setSfxVolume(v / 100)}
            onChangeEnd={() => playSfx("correct")}
            disabled={!sfxEnabled}
            label={(v) => `${v}%`}
            aria-label={t("examDesktop.settings.volume", "Balandlik")}
          />
        </div>

        <Switch
          checked={ttsAuto}
          disabled={!ttsSupported}
          onChange={(e) => {
            setTtsAuto(e.currentTarget.checked);
            setTtsAutoState(e.currentTarget.checked);
          }}
          label={t("examDesktop.settings.ttsAuto", "Savollarni avtomatik ovozli o'qish")}
          description={
            ttsSupported
              ? t("examDesktop.settings.ttsHint", "Imtihonda T tugmasi bilan istalgan vaqtda o'qitish mumkin")
              : t("examDesktop.settings.ttsUnsupported", "Bu tizimda ovozli o'qish mavjud emas")
          }
        />
      </Stack>
    </Paper>
  );
}
