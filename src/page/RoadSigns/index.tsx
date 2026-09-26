import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { IconDirections } from "@tabler/icons-react";
import SEO from "../../components/common/SEO";
import type { RoadSign } from "../../api/curriculumApi";
import { useCurriculum } from "../../features/Curriculum/useCurriculum";
import CatalogPage, { type CatalogCategory } from "../../features/Curriculum/components/CatalogPage";

/** Official categories (server `category` values) — same list as the web app. */
const CATEGORIES = [
  { id: "all", key: "curriculum.all", fallback: "Barchasi" },
  { id: "Ogohlantiruvchi belgilar", key: "curriculum.warning", fallback: "Ogohlantiruvchi" },
  { id: "Imtiyozli belgilar", key: "curriculum.priority", fallback: "Imtiyozli" },
  { id: "Taqiqlovchi belgilar", key: "curriculum.prohibitory", fallback: "Taqiqlovchi" },
  { id: "Buyuruvchi belgilar", key: "curriculum.mandatory", fallback: "Buyuruvchi" },
  { id: "Axborot-ishora belgilari", key: "curriculum.informative", fallback: "Axborot-ishora" },
  { id: "Servis belgilari", key: "curriculum.service", fallback: "Servis" },
  { id: "Qo'shimcha axborot belgilari", key: "curriculum.additional", fallback: "Qo'shimcha" },
];

export default function RoadSigns_Page() {
  const { t } = useTranslation();
  const { data, error, isLoading, refresh, refreshing, savedAt, fromCache } = useCurriculum("signs");
  const signs = useMemo(() => data ?? [], [data]);

  const categories: CatalogCategory<RoadSign>[] = CATEGORIES.map((c) => ({
    id: c.id,
    label: t(c.key, c.fallback),
    match: c.id === "all" ? () => true : (s: RoadSign) => !!s.category && s.category.toLowerCase() === c.id.toLowerCase(),
  }));

  return (
    <>
      <SEO title={t("curriculum.signsTitle", "Yo'l belgilari")} description={t("curriculum.signsSubtitle", "")} canonical="/signs" noIndex />
      <CatalogPage
        section="signs"
        title={t("curriculum.signsTitle", "Yo'l belgilari")}
        subtitle={t("curriculum.signsSubtitle", "")}
        countBadge={(n) => (
          <span className="cur-badge">
            <IconDirections size={14} /> {n} {t("curriculum.signsCount", "ta belgi")}
          </span>
        )}
        items={signs}
        loading={isLoading}
        error={error}
        savedAt={savedAt}
        fromCache={fromCache}
        refreshing={refreshing}
        onRefresh={refresh}
        categories={categories}
        searchPlaceholder={t("curriculum.searchSigns", "Belgi kodi yoki nomini qidiring...")}
        emptyText={t("learn.noSignsFound", "Mos keluvchi belgilar topilmadi")}
        itemMeta={(s) => s.category}
      />
    </>
  );
}
