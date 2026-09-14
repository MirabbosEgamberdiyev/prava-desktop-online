import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Tabs,
  SimpleGrid,
  Center,
  Grid,
  Paper,
  Stack,
  Skeleton,
  Button,
} from "@mantine/core";
import {
  IconPackages,
  IconTicket,
  IconRun,
  IconArrowLeft,
  IconBook2,
} from "@tabler/icons-react";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../hooks/useLanguage";
import { BreadcrumbNav } from "../../../components/common/BreadcrumbNav";
import SEO from "../../../components/common/SEO";
import { Package_Card } from "../../../features/Package/components/Package_Card";
import { TicketCard } from "../../../features/Ticket/components/TicketCard";
import type { Ticket } from "../../../types";
import type { Package } from "../../../features/Package/types";

interface TopicResponse {
  data: {
    id: number;
    code: string;
    name: { uzl: string; uzc: string; en: string; ru: string };
    description?: { uzl: string; uzc: string; en: string; ru: string };
    questionCount: number;
    isActive: boolean;
  };
}

interface PackagesResponse {
  data: {
    content: Package[];
    totalPages: number;
    totalElements: number;
  };
}

interface TicketsResponse {
  success: boolean;
  data: {
    content: Ticket[];
    totalPages: number;
    totalElements: number;
  };
}

const TopicDetail_Page = () => {
  const { topicCode } = useParams<{ topicCode: string }>();
  const { t, i18n } = useTranslation();
  const { localize } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>("packages");

  // Fetch topic by code
  const { data: topicData, isLoading: topicLoading } = useSWR<TopicResponse>(
    topicCode ? `/api/v1/admin/topics/code/${topicCode}` : null
  );

  const topic = topicData?.data;

  // Fetch packages by topic code
  const { data: packagesData, isLoading: packagesLoading } =
    useSWR<PackagesResponse>(
      topicCode
        ? `/api/v1/packages/topic/${topicCode}?page=0&size=50&sortBy=orderIndex&direction=ASC&lang=${i18n.language}`
        : null
    );

  // Fetch tickets by topic id
  const { data: ticketsData, isLoading: ticketsLoading } =
    useSWR<TicketsResponse>(
      topic?.id
        ? `/api/v2/tickets/topic/${topic.id}?page=0&size=50&sortBy=ticketNumber&direction=ASC&lang=${i18n.language}`
        : null
    );

  const packages = packagesData?.data?.content ?? [];
  const tickets = ticketsData?.data?.content ?? [];

  const handleTicketClick = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.id}`);
  };

  if (topicLoading) {
    return (
      <Container size="xl" py="md">
        <Skeleton height={20} width={200} mb="md" />
        <Skeleton height={32} width={300} mb="xs" />
        <Skeleton height={16} width={400} mb="lg" />
        <Skeleton height={40} width="100%" />
      </Container>
    );
  }

  if (!topic) {
    return (
      <Container size="xl" py="md">
        <Center h="50vh">
          <Text c="dimmed">{t("topics.notFound")}</Text>
        </Center>
      </Container>
    );
  }

  const topicName = localize(topic.name);

  return (
    <div className="review-screen">
      <SEO
        title={`${topicName} - Mavzu bo'yicha testlar`}
        description={`${topicName} mavzusi bo'yicha haydovchilik guvohnomasi imtihon savollarini yeching.`}
        canonical={`/topics/${topicCode}`}
        noIndex={true}
      />
      <header className="review-header">
        <button
          className="review-back-btn"
          onClick={() => navigate("/topics")}
          type="button"
        >
          <IconArrowLeft size={18} stroke={2} />
          {t("topics.title", "Mavzular")}
        </button>
        <div className="review-header-title">
          <IconBook2 size={20} stroke={2} color="var(--mantine-color-blue-5)" />
          <span>{topicName}</span>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        <Container size="xl">
          <BreadcrumbNav
            items={[
              { label: t("topics.title"), href: "/topics" },
              { label: topicName },
            ]}
          />

          <Title order={2} mb="xs">
            {topicName}
          </Title>
          {topic.description && (
            <Text c="dimmed" mb="lg">
              {localize(topic.description)}
            </Text>
          )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="packages" leftSection={<IconPackages size={16} />}>
            {t("topics.packages")} ({packages.length})
          </Tabs.Tab>
          <Tabs.Tab value="tickets" leftSection={<IconTicket size={16} />}>
            {t("topics.tickets")} ({tickets.length})
          </Tabs.Tab>
          <Tabs.Tab value="marathon" leftSection={<IconRun size={16} />}>
            {t("marathon.title")}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="packages">
          {packagesLoading ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
              {Array.from({ length: 4 }).map((_, i) => (
                <Paper key={i} withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <Skeleton height={24} width="60%" radius="sm" />
                    <Skeleton height={16} width="40%" radius="sm" />
                    <Skeleton height={36} radius="sm" />
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          ) : packages.length === 0 ? (
            <Center h={200}>
              <Text c="dimmed">{t("package.notFound")}</Text>
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
              {packages.map((pkg) => (
                <Package_Card key={pkg.id} pkg={pkg} />
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="tickets">
          {ticketsLoading ? (
            <Grid gutter="md">
              {Array.from({ length: 4 }).map((_, i) => (
                <Grid.Col key={i} span={{ base: 6, md: 4, lg: 4, xl: 3 }}>
                  <Paper withBorder p="md" radius="md">
                    <Stack gap="sm" align="center">
                      <Skeleton height={40} width={40} circle />
                      <Skeleton height={16} width="60%" radius="sm" />
                      <Skeleton height={12} width="40%" radius="sm" />
                    </Stack>
                  </Paper>
                </Grid.Col>
              ))}
            </Grid>
          ) : tickets.length === 0 ? (
            <Center h={200}>
              <Text c="dimmed">{t("ticket.notFound")}</Text>
            </Center>
          ) : (
            <Grid gutter="md">
              {tickets.map((ticket) => (
                <Grid.Col
                  key={ticket.id}
                  span={{ base: 6, md: 4, lg: 4, xl: 3 }}
                >
                  <TicketCard ticket={ticket} onClick={handleTicketClick} />
                </Grid.Col>
              ))}
            </Grid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="marathon">
          <Center h={200}>
            <Stack align="center" gap="md">
              <Text c="dimmed">{t("marathon.setupDesc")}</Text>
              <Button
                radius="md"
                onClick={() =>
                  navigate("/marafon", { state: { topicId: topic.id } })
                }
              >
                {t("topics.startMarathon")}
              </Button>
            </Stack>
          </Center>
        </Tabs.Panel>
      </Tabs>
        </Container>
      </main>
    </div>
  );
};

export default TopicDetail_Page;
