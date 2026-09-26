import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconGavel } from "@tabler/icons-react";
import SEO from "../../components/common/SEO";
import { useCurriculum } from "../../features/Curriculum/useCurriculum";
import { CurriculumSearch, CurriculumShell, CurriculumState } from "../../features/Curriculum/components/CurriculumShell";
import SidebarList from "../../features/Curriculum/components/SidebarList";
import PenaltyTable, { penaltySeverity, type PenaltySeverity } from "../../features/Curriculum/components/PenaltyTable";
import { normalizeSearchText } from "../../utils/transliterate";

type Filter = "all" | PenaltySeverity;

export default function Penalties_Page() {
  const { t } = useTranslation();
  const { data, error, isLoading, refresh, refreshing, savedAt, fromCache } = useCurriculum("penalties");
  const penalties = useMemo(() => [...(data ?? [])].sort((a, b) => a.penalty_number - b.penalty_number), [data]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const deepQ = params.get("q");
  useEffect(() => {
    if (deepQ) {
      setFilter("all");
      setSearch(deepQ);
    }
  }, [deepQ]);

  const index = useMemo(
    () => new Map(penalties.map((p) => [p.id, normalizeSearchText(`${p.text_uzl} ${p.text_uzc ?? ""} ${p.text_ru ?? ""}`)])),
    [penalties]
  );

  const filtered = useMemo(() => {
    const q = normalizeSearchText(search);
    return penalties.filter((p) => {
      if (filter !== "all" && penaltySeverity(p.points) !== filter) return false;
      if (!q) return true;
      // A bare number is the penalty number (deep links from Ctrl+K use it).
      if (/^\d+$/.test(search.trim())) return String(p.penalty_number) === search.trim();
      return (index.get(p.id) || "").includes(q);
    });
  }, [penalties, filter, search, index]);

  const count = (f: Filter) => (f === "all" ? penalties.length : penalties.filter((p) => penaltySeverity(p.points) === f).length);
  const sidebarItems = [
    { id: "all", label: t("curriculum.all", "Barchasi"), count: count("all") },
    { id: "fail", label: t("curriculum.severityMajor", "Imtihondan yiqitish"), count: count("fail") },
    { id: "major", label: t("curriculum.severityMedium", "Qo'pol"), count: count("major") },
    { id: "minor", label: t("curriculum.severityMinor", "Kichik"), count: count("minor") },
  ];

  return (
    <>
      <SEO title={t("curriculum.finesTitle", "Jarimalar")} description={t("curriculum.finesSubtitle", "")} canonical="/penalties" noIndex />
      <CurriculumShell
        section="penalties"
        title={t("curriculum.finesTitle", "Jarimalar va Qoidabuzarliklar")}
        subtitle={t("curriculum.finesSubtitle", "")}
        badge={
          <span className="cur-badge">
            <IconGavel size={14} /> {filtered.length} {t("curriculum.finesCount", "ta qoida")}
          </span>
        }
        savedAt={savedAt}
        fromCache={fromCache}
        refreshing={refreshing}
        onRefresh={refresh}
        searchRef={searchRef}
        sidebar={
          <>
            <div className="cur-sidebar-head">{t("learn.severity", "Og'irlik darajasi")}</div>
            <SidebarList items={sidebarItems} value={filter} onChange={(id) => setFilter(id as Filter)} ariaLabel={t("learn.severity", "Og'irlik darajasi")} />
          </>
        }
      >
        <CurriculumSearch
          inputRef={searchRef}
          value={search}
          onChange={setSearch}
          placeholder={t("curriculum.searchFines", "Qoidabuzarlik turi bo'yicha qidiring...")}
          resultCount={filtered.length}
        />
        <CurriculumState
          loading={isLoading}
          error={error}
          empty={filtered.length === 0}
          onRetry={refresh}
          emptyText={t("curriculum.emptyFines", "Mos keluvchi jarimalar topilmadi")}
          onClear={
            penalties.length > 0 && (search || filter !== "all")
              ? () => {
                  setSearch("");
                  setFilter("all");
                }
              : undefined
          }
        >
          <div className="cur-panel">
            <div className="cur-panel-scroll">
              <PenaltyTable penalties={filtered} />
            </div>
          </div>
        </CurriculumState>
      </CurriculumShell>
    </>
  );
}
