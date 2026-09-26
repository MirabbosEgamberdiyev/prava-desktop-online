import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { IconRoad } from "@tabler/icons-react";
import SEO from "../../components/common/SEO";
import type { RoadMarking } from "../../api/curriculumApi";
import { useCurriculum } from "../../features/Curriculum/useCurriculum";
import CatalogPage, { type CatalogCategory } from "../../features/Curriculum/components/CatalogPage";

const isVertical = (m: RoadMarking) => !!m.code && m.code.startsWith("2.");
const isHorizontal = (m: RoadMarking) => !!m.code && m.code.startsWith("1.");

export default function RoadMarkings_Page() {
  const { t } = useTranslation();
  const { data, error, isLoading, refresh, refreshing, savedAt, fromCache } = useCurriculum("markings");
  const markings = useMemo(() => data ?? [], [data]);

  const categories: CatalogCategory<RoadMarking>[] = [
    { id: "all", label: t("curriculum.all", "Barchasi"), match: () => true },
    { id: "horizontal", label: t("curriculum.horizontal", "Gorizontal chiziqlar"), match: isHorizontal },
    { id: "vertical", label: t("curriculum.vertical", "Vertikal chiziqlar"), match: isVertical },
  ];

  return (
    <>
      <SEO title={t("curriculum.markingsTitle", "Yo'l chiziqlari")} description={t("curriculum.markingsSubtitle", "")} canonical="/markings" noIndex />
      <CatalogPage
        section="markings"
        title={t("curriculum.markingsTitle", "Yo'l chiziqlari")}
        subtitle={t("curriculum.markingsSubtitle", "")}
        countBadge={(n) => (
          <span className="cur-badge">
            <IconRoad size={14} /> {n} {t("curriculum.markingsCount", "ta chiziq")}
          </span>
        )}
        items={markings}
        loading={isLoading}
        error={error}
        savedAt={savedAt}
        fromCache={fromCache}
        refreshing={refreshing}
        onRefresh={refresh}
        categories={categories}
        searchPlaceholder={t("learn.searchMarkings", "Chiziq raqami yoki nomini qidiring...")}
        emptyText={t("curriculum.emptyMarkings", "Yo'l chiziqlari topilmadi")}
        itemMeta={(m) =>
          isVertical(m) ? t("curriculum.verticalBadge", "Vertikal") : t("curriculum.horizontalBadge", "Gorizontal")
        }
      />
    </>
  );
}
