import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Container,
  Title,
  Group,
  Button,
  Stack,
  Tabs,
  TextInput,
  Table,
  Text,
  Badge,
  ActionIcon,
  Menu,
  Pagination,
  Paper,
  Skeleton,
  Alert,
  Tooltip,
  Modal,
  Textarea,
  CopyButton,
  SimpleGrid,
  Card,
  ThemeIcon,
  Divider,
  Box,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconPlus,
  IconSearch,
  IconDots,
  IconBan,
  IconRefresh,
  IconTrash,
  IconCopy,
  IconCheck,
  IconAlertCircle,
  IconKey,
  IconEye,
  IconClockHour4,
  IconCircleCheck,
  IconCircleX,
  IconCircleMinus,
} from "@tabler/icons-react";
import activationCodeService, {
  type ActivationCodeResponse,
  type ActivationCodeStats,
  type ListParams,
  type PageData,
} from "../../../api/activationCodeService";
import GenerateModal from "./GenerateModal";

// ── Shared constant ───────────────────────────────────────────────────────────

const NS = "admin.activationCodes";

// ── SWR fetchers ──────────────────────────────────────────────────────────────

const fetchStats = () => activationCodeService.getStats();
const fetchList  = (params: ListParams) => activationCodeService.list(params);

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

type GroupTab = "ALL" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "DEACTIVATED";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:      "green",
  EXPIRING:    "orange",
  EXPIRED:     "red",
  DEACTIVATED: "dark",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function localDate(d?: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString();
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

// ── Main Page ─────────────────────────────────────────────────────────────────

const ActivationCodesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]       = useState<GroupTab>("ALL");
  const [page, setPage]                 = useState(1);
  const [searchRaw, setSearchRaw]       = useState("");
  const [search]                        = useDebouncedValue(searchRaw, 350);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [detailCode, setDetailCode]     = useState<ActivationCodeResponse | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ActivationCodeResponse | null>(null);

  // ── SWR keys ───────────────────────────────────────────────────────────
  const statsKey = "activation-codes-stats";
  const listKey  = JSON.stringify({
    k:      "activation-codes-list",
    group:  activeTab === "ALL" ? undefined : activeTab,
    search: search || undefined,
    page:   page - 1,
    size:   PAGE_SIZE,
  });

  const { data: stats, isLoading: statsLoading } =
    useSWR<ActivationCodeStats>(statsKey, fetchStats, { refreshInterval: 60_000 });

  const listParams: ListParams = {
    group:   activeTab === "ALL" ? undefined : activeTab,
    search:  search || undefined,
    page:    page - 1,
    size:    PAGE_SIZE,
    sortBy:  "createdAt",
    sortDir: "desc",
  };

  const { data: listData, isLoading: listLoading, error: listError } =
    useSWR<PageData<ActivationCodeResponse>>(
      listKey,
      () => fetchList(listParams),
      { refreshInterval: 30_000, keepPreviousData: true },
    );

  const refreshAll = useCallback(() => {
    globalMutate(statsKey);
    globalMutate(listKey);
  }, [listKey]);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleDeactivate = async (code: ActivationCodeResponse, reason: string) => {
    try {
      await activationCodeService.deactivate(code.id, reason);
      notifications.show({
        message: t(`${NS}.notifications.deactivated`),
        color:   "orange",
        icon:    <IconCheck size={16} />,
      });
      setDeactivateTarget(null);
      refreshAll();
    } catch (err) {
      notifications.show({
        message: extractErrorMessage(err),
        color:   "red",
        icon:    <IconAlertCircle size={16} />,
      });
    }
  };

  const handleReactivate = async (code: ActivationCodeResponse) => {
    try {
      await activationCodeService.reactivate(code.id);
      notifications.show({
        message: t(`${NS}.notifications.reactivated`),
        color:   "green",
        icon:    <IconCheck size={16} />,
      });
      refreshAll();
    } catch (err) {
      notifications.show({
        message: extractErrorMessage(err),
        color:   "red",
        icon:    <IconAlertCircle size={16} />,
      });
    }
  };

  const handleDelete = async (code: ActivationCodeResponse) => {
    if (!window.confirm(t(`${NS}.deleteConfirm`, { name: code.clientFullName }))) return;
    try {
      await activationCodeService.delete(code.id);
      notifications.show({
        message: t(`${NS}.notifications.deleted`),
        color:   "gray",
        icon:    <IconCheck size={16} />,
      });
      refreshAll();
    } catch (err) {
      notifications.show({
        message: extractErrorMessage(err),
        color:   "red",
        icon:    <IconAlertCircle size={16} />,
      });
    }
  };

  // ── Tab config ─────────────────────────────────────────────────────────
  const TABS: {
    value: GroupTab;
    labelKey: string;
    color: string;
    statsKey: keyof ActivationCodeStats;
  }[] = [
    { value: "ALL",         labelKey: `${NS}.tabs.all`,         color: "gray",   statsKey: "totalAll"         },
    { value: "ACTIVE",      labelKey: `${NS}.tabs.active`,      color: "green",  statsKey: "totalActive"      },
    { value: "EXPIRING",    labelKey: `${NS}.tabs.expiring`,    color: "orange", statsKey: "totalExpiring"    },
    { value: "EXPIRED",     labelKey: `${NS}.tabs.expired`,     color: "red",    statsKey: "totalExpired"     },
    { value: "DEACTIVATED", labelKey: `${NS}.tabs.deactivated`, color: "dark",   statsKey: "totalDeactivated" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Container size="xl" py="xl">

      {/* Header */}
      <Group justify="space-between" mb="xl" align="flex-start">
        <Stack gap={4}>
          <Group gap="xs">
            <ThemeIcon size="lg" variant="light" color="blue" radius="md">
              <IconKey size={18} />
            </ThemeIcon>
            <Title order={2}>{t(`${NS}.title`)}</Title>
          </Group>
          <Text c="dimmed" size="sm" pl={44}>
            {t(`${NS}.subtitle`)}
          </Text>
        </Stack>
        <Group>
          <Button
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate("/me")}
            radius="md"
          >
            {t("common.back", "Orqaga")}
          </Button>
          <Tooltip label={t(`${NS}.refresh`)}>
            <ActionIcon variant="light" onClick={refreshAll} size="lg" radius="md">
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setGenerateOpen(true)}
            radius="md"
          >
            {t(`${NS}.newCode`)}
          </Button>
        </Group>
      </Group>

      {/* Stats cards */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} mb="xl" spacing="sm">
        <StatsCard label={t(`${NS}.stats.totalAll`)}         value={stats?.totalAll}         color="blue"   icon={<IconKey size={20} />}          loading={statsLoading} />
        <StatsCard label={t(`${NS}.stats.totalActive`)}      value={stats?.totalActive}      color="green"  icon={<IconCircleCheck size={20} />}  loading={statsLoading} />
        <StatsCard label={t(`${NS}.stats.totalExpiring`)}    value={stats?.totalExpiring}    color="orange" icon={<IconClockHour4 size={20} />}   loading={statsLoading} />
        <StatsCard label={t(`${NS}.stats.totalExpired`)}     value={stats?.totalExpired}     color="red"    icon={<IconCircleX size={20} />}      loading={statsLoading} />
        <StatsCard label={t(`${NS}.stats.totalDeactivated`)} value={stats?.totalDeactivated} color="dark"   icon={<IconCircleMinus size={20} />}  loading={statsLoading} />
      </SimpleGrid>

      {/* Tabs */}
      <Paper withBorder radius="md" mb="md" p={0} style={{ overflow: "hidden" }}>
        <Tabs
          value={activeTab}
          onChange={(v) => { setActiveTab((v ?? "ALL") as GroupTab); setPage(1); }}
        >
          <Tabs.List style={{ flexWrap: "nowrap", overflowX: "auto" }}>
            {TABS.map((tab) => {
              const count = stats ? stats[tab.statsKey] : undefined;
              return (
                <Tabs.Tab
                  key={tab.value}
                  value={tab.value}
                  px="md"
                  rightSection={
                    statsLoading ? (
                      <Skeleton w={24} h={18} radius="xl" />
                    ) : count !== undefined ? (
                      <Badge
                        size="sm"
                        variant={activeTab === tab.value ? "filled" : "light"}
                        color={tab.color}
                      >
                        {count}
                      </Badge>
                    ) : null
                  }
                >
                  {t(tab.labelKey)}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs>
      </Paper>

      {/* Search */}
      <TextInput
        placeholder={t(`${NS}.search`)}
        leftSection={<IconSearch size={16} />}
        value={searchRaw}
        onChange={(e) => { setSearchRaw(e.currentTarget.value); setPage(1); }}
        mb="md"
        maw={520}
        radius="md"
      />

      {/* Table */}
      <Paper withBorder radius="md" p={0} style={{ overflow: "hidden" }}>
        {listError ? (
          <Alert color="red" m="md" icon={<IconAlertCircle />} radius="md">
            {t(`${NS}.loadError`)}: {extractErrorMessage(listError)}
          </Alert>
        ) : listLoading && !listData ? (
          <TableSkeleton />
        ) : listData && listData.content.length === 0 ? (
          <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={56} variant="light" color="gray" radius="xl">
              <IconKey size={28} />
            </ThemeIcon>
            <Text c="dimmed" size="sm">{t(`${NS}.empty`)}</Text>
          </Stack>
        ) : (
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>{t(`${NS}.table.client`)}</Table.Th>
                <Table.Th>{t(`${NS}.table.phone`)}</Table.Th>
                <Table.Th>{t(`${NS}.table.learningCenter`)}</Table.Th>
                <Table.Th>{t(`${NS}.table.machineId`)}</Table.Th>
                <Table.Th>{t(`${NS}.table.validity`)}</Table.Th>
                <Table.Th>{t(`${NS}.table.status`)}</Table.Th>
                <Table.Th>{t(`${NS}.table.generatedBy`)}</Table.Th>
                <Table.Th style={{ width: 56 }} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(listData?.content ?? []).map((code) => (
                <CodeRow
                  key={code.id}
                  code={code}
                  onView={() => setDetailCode(code)}
                  onDeactivate={() => setDeactivateTarget(code)}
                  onReactivate={() => handleReactivate(code)}
                  onDelete={() => handleDelete(code)}
                />
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {/* Pagination */}
      {listData && listData.totalPages > 1 && (
        <Group justify="center" mt="md">
          <Pagination
            total={listData.totalPages}
            value={page}
            onChange={setPage}
            size="sm"
            radius="md"
          />
        </Group>
      )}

      {/* Modals */}
      <GenerateModal
        opened={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onSuccess={() => { setGenerateOpen(false); refreshAll(); }}
      />
      {detailCode && (
        <DetailModal code={detailCode} onClose={() => setDetailCode(null)} />
      )}
      {deactivateTarget && (
        <DeactivateModal
          code={deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={(reason) => handleDeactivate(deactivateTarget, reason)}
        />
      )}
    </Container>
  );
};

// ── Stats card ────────────────────────────────────────────────────────────────

const StatsCard: React.FC<{
  label: string;
  value?: number;
  color: string;
  icon: React.ReactNode;
  loading: boolean;
}> = ({ label, value, color, icon, loading }) => (
  <Card withBorder radius="md" padding="md">
    <Group justify="space-between" mb={4}>
      <ThemeIcon size="md" variant="light" color={color} radius="md">
        {icon}
      </ThemeIcon>
      {loading ? (
        <Skeleton w={36} h={28} radius="sm" />
      ) : (
        <Text fw={700} size="xl" c={color}>{value ?? 0}</Text>
      )}
    </Group>
    <Text size="xs" c="dimmed" fw={500}>{label}</Text>
  </Card>
);

// ── Table row ─────────────────────────────────────────────────────────────────

const CodeRow: React.FC<{
  code: ActivationCodeResponse;
  onView: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}> = ({ code, onView, onDeactivate, onReactivate, onDelete }) => {
  const { t } = useTranslation();
  const isExpired  = code.daysUntilExpiry < 0;
  const isExpiring = !isExpired && code.daysUntilExpiry < 4;

  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" fw={500}>{code.clientFullName ?? "—"}</Text>
      </Table.Td>

      <Table.Td>
        <Text size="sm" ff="monospace" c={code.clientPhone ? undefined : "dimmed"}>
          {code.clientPhone ?? "—"}
        </Text>
      </Table.Td>

      <Table.Td>
        <Text size="sm" c={code.learningCenter ? undefined : "dimmed"} lineClamp={1}>
          {code.learningCenter ?? "—"}
        </Text>
      </Table.Td>

      <Table.Td>
        <Group gap={4} wrap="nowrap">
          <Text size="xs" ff="monospace" c="dimmed" maw={130} truncate>
            {code.machineId}
          </Text>
          <CopyButton value={code.machineId} timeout={1500}>
            {({ copied, copy }) => (
              <ActionIcon size="xs" variant="subtle" color={copied ? "teal" : "gray"} onClick={copy}>
                {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
              </ActionIcon>
            )}
          </CopyButton>
        </Group>
      </Table.Td>

      <Table.Td>
        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            {localDate(code.startDate)} → {localDate(code.endDate)}
          </Text>
          <Text size="xs" fw={500} c={isExpired ? "red" : isExpiring ? "orange" : "teal"}>
            {isExpired
              ? t(`${NS}.days.overdue`,    { count: Math.abs(code.daysUntilExpiry) })
              : t(`${NS}.days.remaining`,  { count: code.daysUntilExpiry })}
          </Text>
        </Stack>
      </Table.Td>

      <Table.Td>
        <Badge
          color={STATUS_COLOR[code.displayGroup] ?? "gray"}
          variant="light"
          size="sm"
          radius="sm"
        >
          {t(`${NS}.status.${code.displayGroup}`, { defaultValue: code.displayGroup })}
        </Badge>
      </Table.Td>

      <Table.Td>
        <Text size="xs" c="dimmed">{code.generatedBy ?? "—"}</Text>
      </Table.Td>

      <Table.Td>
        <Menu withinPortal shadow="md" position="bottom-end" radius="md">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" radius="md">
              <IconDots size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEye size={14} />} onClick={onView}>
              {t(`${NS}.actions.view`)}
            </Menu.Item>
            <Menu.Divider />
            {code.status === "ACTIVE" && (
              <Menu.Item leftSection={<IconBan size={14} />} color="red" onClick={onDeactivate}>
                {t(`${NS}.actions.deactivate`)}
              </Menu.Item>
            )}
            {code.status === "DEACTIVATED" && (
              <Menu.Item leftSection={<IconRefresh size={14} />} color="green" onClick={onReactivate}>
                {t(`${NS}.actions.reactivate`)}
              </Menu.Item>
            )}
            {(code.status === "DEACTIVATED" || code.status === "EXPIRED") && (
              <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={onDelete}>
                {t(`${NS}.actions.delete`)}
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  );
};

// ── Detail Modal ──────────────────────────────────────────────────────────────

const DetailModal: React.FC<{
  code: ActivationCodeResponse;
  onClose: () => void;
}> = ({ code, onClose }) => {
  const { t } = useTranslation();
  const d = `${NS}.detail`;
  const isExpired  = code.daysUntilExpiry < 0;
  const isExpiring = !isExpired && code.daysUntilExpiry < 4;
  const daysColor  = isExpired ? "red" : isExpiring ? "orange" : "green";

  return (
    <Modal
      opened
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon size="sm" variant="light" color="blue">
            <IconKey size={14} />
          </ThemeIcon>
          <Text fw={600}>{t(`${d}.title`)}</Text>
        </Group>
      }
      size="lg"
    >
      <Stack gap="sm">
        <InfoRow label={t(`${d}.client`)} value={code.clientFullName ?? "—"} />
        {code.clientPhone    && <InfoRow label={t(`${d}.phone`)}          value={code.clientPhone}    mono />}
        {code.learningCenter && <InfoRow label={t(`${d}.learningCenter`)} value={code.learningCenter}      />}

        <Divider />

        <InfoRow label={t(`${d}.machineId`)} value={code.machineId} mono />
        <InfoRow label={t(`${d}.startDate`)} value={localDate(code.startDate)} />
        <InfoRow label={t(`${d}.endDate`)}   value={localDate(code.endDate)} />
        <InfoRow
          label={t(`${d}.daysLeft`)}
          value={
            <Text size="sm" fw={600} c={daysColor}>
              {isExpired ? `−${Math.abs(code.daysUntilExpiry)}` : `+${code.daysUntilExpiry}`}
            </Text>
          }
        />
        <InfoRow
          label={t(`${d}.status`)}
          value={
            <Badge color={STATUS_COLOR[code.displayGroup] ?? "gray"} variant="light">
              {t(`${NS}.status.${code.displayGroup}`, { defaultValue: code.displayGroup })}
            </Badge>
          }
        />

        <Divider />

        {code.notes && <InfoRow label={t(`${d}.notes`)} value={code.notes} />}
        <InfoRow label={t(`${d}.generatedBy`)} value={code.generatedBy ?? "—"} />
        <InfoRow
          label={t(`${d}.createdAt`)}
          value={code.createdAt ? new Date(code.createdAt).toLocaleString() : "—"}
        />

        {/* License key */}
        <Paper withBorder p="md" radius="md" bg="gray.0" mt="xs">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: 1 }} mb={8}>
            {t(`${d}.licenseKey`)}
          </Text>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Box style={{ flex: 1, overflow: "hidden" }}>
              <Text size="xs" ff="monospace" style={{ wordBreak: "break-all" }}>
                {code.licenseKey}
              </Text>
            </Box>
            <CopyButton value={code.licenseKey} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip
                  label={copied
                    ? t(`${NS}.generate.copied`)
                    : t(`${NS}.generate.copyCode`)}
                  withArrow
                >
                  <ActionIcon
                    color={copied ? "teal" : "blue"}
                    variant="light"
                    onClick={copy}
                    style={{ flexShrink: 0 }}
                  >
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Paper>

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose} radius="md">
            {t(`${d}.close`)}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

// ── Deactivate Confirm Modal ──────────────────────────────────────────────────

const DeactivateModal: React.FC<{
  code: ActivationCodeResponse;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}> = ({ code, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const d = `${NS}.deactivate`;
  const [reason, setReason]   = useState("");
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      await onConfirm(reason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon size="sm" variant="light" color="red">
            <IconBan size={14} />
          </ThemeIcon>
          <Text fw={600} c="red">{t(`${d}.title`)}</Text>
        </Group>
      }
      size="sm"
    >
      <Stack gap="sm">
        <Alert color="orange" radius="md" icon={<IconAlertCircle size={16} />}>
          {t(`${d}.message`, {
            name:      code.clientFullName ?? "—",
            machineId: code.machineId,
          })}
        </Alert>
        <Textarea
          label={t(`${d}.reason`)}
          placeholder={t(`${d}.reasonPlaceholder`)}
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          rows={3}
          radius="md"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={loading} radius="md">
            {t(`${d}.cancel`)}
          </Button>
          <Button color="red" loading={loading} onClick={confirm} radius="md">
            {t(`${d}.confirm`)}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

// ── Table skeleton ────────────────────────────────────────────────────────────

const TableSkeleton: React.FC = () => (
  <Stack p="md" gap="xs">
    {[...Array(6)].map((_, i) => (
      <Skeleton key={i} h={52} radius="sm" />
    ))}
  </Stack>
);

// ── InfoRow ───────────────────────────────────────────────────────────────────

const InfoRow: React.FC<{
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}> = ({ label, value, mono }) => (
  <Group gap="sm" wrap="nowrap">
    <Text size="sm" c="dimmed" w={140} style={{ flexShrink: 0 }}>{label}:</Text>
    {typeof value === "string" ? (
      <Text size="sm" ff={mono ? "monospace" : undefined} style={{ wordBreak: "break-word" }}>
        {value}
      </Text>
    ) : (
      value
    )}
  </Group>
);

export default ActivationCodesPage;
