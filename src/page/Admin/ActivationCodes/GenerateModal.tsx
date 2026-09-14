import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Group,
  Stack,
  Text,
  Divider,
  Alert,
  CopyButton,
  ActionIcon,
  Tooltip,
  Paper,
  Badge,
  ThemeIcon,
  Box,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconCopy,
  IconAlertCircle,
  IconUser,
  IconDeviceLaptop,
  IconCalendar,
  IconKey,
} from "@tabler/icons-react";
import activationCodeService, {
  type GenerateRequest,
  type ActivationCodeResponse,
} from "../../../api/activationCodeService";

const NS = "admin.activationCodes";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSuccess: (code: ActivationCodeResponse) => void;
}

interface FormValues {
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  learningCenter: string;
  machineId: string;
  startDate: Date | null;
  endDate: Date | null;
  notes: string;
}

const GenerateModal: React.FC<Props> = ({ opened, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const g = `${NS}.generate`;
  const v = `${NS}.validation`;

  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<ActivationCodeResponse | null>(null);

  const form = useForm<FormValues>({
    initialValues: {
      clientFirstName: "",
      clientLastName: "",
      clientPhone: "",
      learningCenter: "",
      machineId: "",
      startDate: new Date(),
      endDate: null,
      notes: "",
    },
    validate: {
      clientFirstName: (val) =>
        val && val.length > 100 ? t(`${v}.firstNameMax`) : null,
      clientLastName: (val) =>
        val && val.length > 100 ? t(`${v}.lastNameMax`) : null,
      clientPhone: (val) => {
        if (!val || !val.trim()) return null;
        return /^[+]?[0-9\s\-()]{7,20}$/.test(val.trim())
          ? null
          : t(`${v}.phoneInvalid`);
      },
      machineId: (val) =>
        !val.trim()
          ? t(`${v}.machineIdRequired`)
          : val.trim().length < 4
          ? t(`${v}.machineIdMin`)
          : null,
      startDate: (val) => (!val ? t(`${v}.startDateRequired`) : null),
      endDate: (val, values) => {
        if (!val) return t(`${v}.endDateRequired`);
        if (values.startDate && val < values.startDate)
          return t(`${v}.endDateBeforeStart`);
        return null;
      },
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const req: GenerateRequest = {
        clientFirstName: values.clientFirstName.trim() || undefined,
        clientLastName:  values.clientLastName.trim()  || undefined,
        clientPhone:     values.clientPhone.trim()     || undefined,
        learningCenter:  values.learningCenter.trim()  || undefined,
        machineId:       values.machineId.trim(),
        startDate:       formatDate(values.startDate!),
        endDate:         formatDate(values.endDate!),
        notes:           values.notes.trim() || undefined,
      };

      const result = await activationCodeService.generate(req);
      setGeneratedCode(result);
      onSuccess(result);
      notifications.show({
        title: t(`${g}.successTitle`),
        message: t(`${g}.successMsg`),
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (err: unknown) {
      notifications.show({
        title: t("common.error"),
        message: extractErrorMessage(err),
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setGeneratedCode(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <ThemeIcon size="sm" variant="light" color="blue">
            <IconKey size={14} />
          </ThemeIcon>
          <Text fw={600} size="lg">{t(`${g}.title`)}</Text>
        </Group>
      }
      size="lg"
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      {generatedCode ? (
        <GeneratedResult code={generatedCode} onClose={handleClose} />
      ) : (
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">

            {/* ── Client info ─────────────────────────── */}
            <Group gap="xs">
              <ThemeIcon size="xs" variant="light" color="gray" radius="xl">
                <IconUser size={10} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="dimmed">{t(`${g}.clientInfo`)}</Text>
            </Group>

            <Group grow>
              <TextInput
                label={t(`${g}.firstName`)}
                placeholder={t(`${g}.firstNamePlaceholder`)}
                {...form.getInputProps("clientFirstName")}
              />
              <TextInput
                label={t(`${g}.lastName`)}
                placeholder={t(`${g}.lastNamePlaceholder`)}
                {...form.getInputProps("clientLastName")}
              />
            </Group>
            <Group grow>
              <TextInput
                label={t(`${g}.phone`)}
                placeholder={t(`${g}.phonePlaceholder`)}
                {...form.getInputProps("clientPhone")}
              />
              <TextInput
                label={t(`${g}.learningCenter`)}
                placeholder={t(`${g}.learningCenterPlaceholder`)}
                {...form.getInputProps("learningCenter")}
              />
            </Group>

            <Divider />

            {/* ── License info ────────────────────────── */}
            <Group gap="xs">
              <ThemeIcon size="xs" variant="light" color="blue" radius="xl">
                <IconDeviceLaptop size={10} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="dimmed">{t(`${g}.licenseInfo`)}</Text>
            </Group>

            <TextInput
              label={t(`${g}.machineId`)}
              placeholder={t(`${g}.machineIdPlaceholder`)}
              description={t(`${g}.machineIdDesc`)}
              required
              styles={{ input: { fontFamily: "monospace", letterSpacing: "0.03em" } }}
              {...form.getInputProps("machineId")}
            />

            <Group grow>
              <DatePickerInput
                label={t(`${g}.startDate`)}
                placeholder={t(`${g}.selectDate`)}
                required
                valueFormat="YYYY-MM-DD"
                leftSection={<IconCalendar size={14} />}
                {...form.getInputProps("startDate")}
              />
              <DatePickerInput
                label={t(`${g}.endDate`)}
                placeholder={t(`${g}.selectDate`)}
                required
                valueFormat="YYYY-MM-DD"
                minDate={form.values.startDate ?? undefined}
                leftSection={<IconCalendar size={14} />}
                {...form.getInputProps("endDate")}
              />
            </Group>

            <Divider />

            <Textarea
              label={t(`${g}.notes`)}
              placeholder={t(`${g}.notesPlaceholder`)}
              rows={3}
              {...form.getInputProps("notes")}
            />

            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={handleClose} disabled={loading}>
                {t(`${g}.cancel`)}
              </Button>
              <Button type="submit" loading={loading} leftSection={<IconKey size={14} />}>
                {t(`${g}.submit`)}
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
};

// ── Generated result view ─────────────────────────────────────────────────────

const GeneratedResult: React.FC<{
  code: ActivationCodeResponse;
  onClose: () => void;
}> = ({ code, onClose }) => {
  const { t } = useTranslation();
  const g = `${NS}.generate`;

  return (
    <Stack gap="md">
      <Alert
        color="green"
        title={t(`${g}.resultTitle`)}
        icon={<IconCheck />}
        radius="md"
      >
        {t(`${g}.resultNote`)}
      </Alert>

      {/* License key box */}
      <Paper withBorder p="md" radius="md" bg="gray.0">
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: 1 }}>
            {t(`${NS}.detail.licenseKey`)}
          </Text>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Box style={{ flex: 1, overflow: "hidden" }}>
              <Text
                size="sm"
                ff="monospace"
                fw={600}
                style={{ wordBreak: "break-all" }}
              >
                {code.licenseKey}
              </Text>
            </Box>
            <CopyButton value={code.licenseKey} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip
                  label={copied ? t(`${g}.copied`) : t(`${g}.copyCode`)}
                  withArrow
                >
                  <ActionIcon
                    color={copied ? "teal" : "blue"}
                    variant="filled"
                    onClick={copy}
                    size="lg"
                    style={{ flexShrink: 0 }}
                  >
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Stack>
      </Paper>

      {/* Summary badges */}
      <Group gap="sm" wrap="wrap">
        <Badge color="blue" variant="light" size="md">
          {code.machineId}
        </Badge>
        <Badge color="green" variant="light" size="md">
          {code.startDate} → {code.endDate}
        </Badge>
        <Badge
          color={code.daysUntilExpiry > 3 ? "teal" : "orange"}
          variant="light"
          size="md"
        >
          {code.daysUntilExpiry} {t(`${NS}.detail.daysLeft`).toLowerCase()}
        </Badge>
      </Group>

      {code.clientFullName && code.clientFullName !== "—" && (
        <Group gap="xs">
          <Text size="sm" c="dimmed">{t(`${NS}.detail.client`)}:</Text>
          <Text size="sm" fw={500}>{code.clientFullName}</Text>
        </Group>
      )}

      <Group justify="flex-end">
        <Button onClick={onClose} variant="filled">
          {t(`${g}.closeBtn`)}
        </Button>
      </Group>
    </Stack>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return e.response?.data?.message ?? e.message ?? "Unknown error";
  }
  return "Unknown error";
}

export default GenerateModal;
