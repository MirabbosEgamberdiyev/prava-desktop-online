import { useSearchParams } from "react-router-dom";
import useSWR from "swr";
import {
  SimpleGrid,
  Skeleton,
  Center,
  Title,
  Text,
  Pagination,
  Paper,
  Stack,
  Group,
  Button,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Package_Card } from "./Package_Card";
import { TopicFilter } from "../../Topic/components/TopicFilter";
import type { PackageResponse, Package } from "../types";

const PAGE_SIZE = 20;

const Package_List = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = Number(searchParams.get("page") ?? 0);
  const page = Number.isFinite(rawPage) ? Math.max(0, Math.trunc(rawPage)) : 0;
  /*
   * BUG FIX: mavzu filtri `useState` da nusxalanardi va faqat mount paytida
   * URL dan o'qilardi. Brauzerning "orqaga/oldinga" tugmasi URL ni
   * o'zgartirganda state eski qiymatda qolib, ro'yxat bilan filtr
   * ko'rsatkichi bir-biriga mos kelmay qolardi. Endi yagona manba — URL.
   */
  const selectedTopicCode = searchParams.get("topic");

  // API endpoint - til o'zgarganda qayta so'rov yuboriladi
  const url = selectedTopicCode
    ? `/api/v1/packages/topic/${selectedTopicCode}?page=${page}&size=${PAGE_SIZE}&sortBy=orderIndex&direction=ASC&lang=${i18n.language}`
    : `/api/v1/packages?page=${page}&size=${PAGE_SIZE}&sortBy=orderIndex&direction=ASC&lang=${i18n.language}`;

  const { data, isLoading, error, mutate } = useSWR<PackageResponse>(url);

  // Paketlar ro'yxati
  const packages = data?.data.content ?? [];

  // Jami sahifalar soni
  const totalPages = data?.data.totalPages ?? 0;

  const setPage = (p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p === 0) next.delete("page");
      else next.set("page", String(p));
      return next;
    }, { replace: true });
  };

  const handleTopicChange = (value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("page");
      if (value) next.set("topic", value);
      else next.delete("topic");
      return next;
    }, { replace: true });
  };

  // Birinchi yuklash - skeleton loader
  if (isLoading) {
    return (
      <>
        <Group justify="space-between" mb="md" wrap="wrap">
          <Title order={3}>{t("package.title")}</Title>
          <TopicFilter
            value={selectedTopicCode}
            onChange={handleTopicChange}
            valueKey="code"
          />
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
          {Array.from({ length: 8 }).map((_, i) => (
            <Paper key={i} withBorder p="md" radius="md">
              <Stack gap="sm">
                <Skeleton height={24} width="60%" radius="sm" />
                <Skeleton height={16} width="40%" radius="sm" />
                <Skeleton height={36} radius="sm" />
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </>
    );
  }

  /*
   * Xatolik: avval faqat qizil sarlavha chiqardi — na qayta urinish,
   * na filtrga qaytish imkoni bor edi (foydalanuvchi uchun boshi berk ko'cha).
   */
  if (error) {
    return (
      <Center h={240}>
        <Stack align="center" gap="sm">
          <Title order={4} c="red">
            {t("common.errorOccurred")}
          </Title>
          <Button variant="light" onClick={() => mutate()}>
            {t("common.retry")}
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Title order={3}>{t("package.title")}</Title>
        <TopicFilter
          value={selectedTopicCode}
          onChange={handleTopicChange}
          valueKey="code"
        />
      </Group>

      {packages.length === 0 ? (
        <Center h={200}>
          <Text c="dimmed">{t("package.notFound")}</Text>
        </Center>
      ) : (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
            {packages.map((item: Package) => (
              <Package_Card key={item.id} pkg={item} />
            ))}
          </SimpleGrid>

          {/* Bitta sahifa bo'lsa paginatsiya keraksiz shovqin */}
          {totalPages > 1 && (
            <Group justify="center">
              <Pagination
                mt="lg"
                total={totalPages}
                value={page + 1}
                onChange={(value) => setPage(value - 1)}
                size="md"
                withEdges
              />
            </Group>
          )}
        </>
      )}
    </>
  );
};

export { Package_List };
