import type { KeyboardEvent, ReactNode } from "react";
import {
  Modal,
  SimpleGrid,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  useComputedColorScheme,
} from "@mantine/core";
import { IconEye, IconLock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export type ExamMode = "visible" | "secure" | "simple" | "explanatory";

interface ExamModeModalProps {
  opened: boolean;
  onClose: () => void;
  onSelect: (mode: ExamMode) => void;
}

/**
 * A11Y TUZATISH: avval bu kartalar oddiy `Paper onClick` edi — ya'ni ular
 * fokus olmasdi, Tab bilan yetib bo'lmasdi, Enter/Space ishlamasdi va
 * screen reader ularni "tugma" deb e'lon qilmasdi. Imtihon boshlash —
 * ilovaning asosiy oqimi, shuning uchun u faqat sichqoncha bilan
 * ishlaydigan bo'lib qolgan edi.
 */
function ModeCard({
  color,
  icon,
  title,
  description,
  computedColorScheme,
  onSelect,
}: {
  color: "green" | "red";
  icon: ReactNode;
  title: string;
  description: string;
  computedColorScheme: string;
  onSelect: () => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <Paper
      role="button"
      tabIndex={0}
      aria-label={`${title} — ${description}`}
      p="lg"
      radius="md"
      withBorder
      ta="center"
      style={{
        cursor: "pointer",
        borderColor: `var(--mantine-color-${color}-5)`,
        backgroundColor:
          computedColorScheme === "light"
            ? `var(--mantine-color-${color}-0)`
            : `var(--mantine-color-${color}-9)`,
        transition: "transform 0.15s ease",
      }}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <Stack align="center" gap="sm">
        <ThemeIcon size="xl" radius="xl" color={color} variant="light">
          {icon}
        </ThemeIcon>
        <Text fw={600}>{title}</Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </Stack>
    </Paper>
  );
}

export function ExamModeModal({ opened, onClose, onSelect }: ExamModeModalProps) {
  const { t } = useTranslation();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const handleSelect = (mode: ExamMode) => {
    onSelect(mode);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("examMode.title")}
      centered
      size="md"
    >
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
        <ModeCard
          color="green"
          icon={<IconEye size={28} />}
          title={t("examMode.practice")}
          description={t("examMode.practiceDesc")}
          computedColorScheme={computedColorScheme}
          onSelect={() => handleSelect("visible")}
        />
        <ModeCard
          color="red"
          icon={<IconLock size={28} />}
          title={t("examMode.realExam")}
          description={t("examMode.realExamDesc")}
          computedColorScheme={computedColorScheme}
          onSelect={() => handleSelect("secure")}
        />
      </SimpleGrid>
    </Modal>
  );
}
