import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconBuildingSkyscraper,
  IconBus,
  IconClock,
  IconExternalLink,
  IconMapPin,
  IconPhone,
  IconReceipt,
} from "@tabler/icons-react";
import SEO from "../../components/common/SEO";
import { useLanguage } from "../../context/LanguageContext";
import type { ExamCenter } from "../../api/curriculumApi";
import { useCurriculum } from "../../features/Curriculum/useCurriculum";
import { pickLocalized } from "../../features/Curriculum/localize";
import { CurriculumSearch, CurriculumShell, CurriculumState } from "../../features/Curriculum/components/CurriculumShell";
import SidebarList from "../../features/Curriculum/components/SidebarList";
import { normalizeSearchText } from "../../utils/transliterate";
import { isSafeExternalUrl, openExternal } from "../../utils/openExternal";

const fmtPrice = (n: number | undefined, fallback: string) => (n ? n.toLocaleString("ru-RU") : fallback);

export default function ExamCenters_Page() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const { data, error, isLoading, refresh, refreshing, savedAt, fromCache } = useCurriculum("centers");
  const centers = useMemo(() => data ?? [], [data]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const deepId = params.get("id");
  useEffect(() => {
    if (deepId) {
      setSearch("");
      setSelectedId(deepId);
    }
  }, [deepId]);

  const region = (c: ExamCenter) => pickLocalized(c, "region", lang);

  const filtered = useMemo(() => {
    const q = normalizeSearchText(search);
    if (!q) return centers;
    return centers.filter((c) =>
      normalizeSearchText(
        `${c.region_uzl} ${c.region_uzc ?? ""} ${c.region_ru ?? ""} ${c.address_uzl} ${c.address_uzc ?? ""} ${c.address_ru ?? ""} ${c.phones ?? ""}`
      ).includes(q)
    );
  }, [centers, search]);

  const selected = filtered.find((c) => String(c.id) === selectedId) ?? filtered[0] ?? null;

  return (
    <>
      <SEO title={t("curriculum.centersTitle", "Imtihon markazlari")} description={t("curriculum.centersSubtitle", "")} canonical="/exam-centers" noIndex />
      <CurriculumShell
        section="exam-centers"
        title={t("curriculum.centersTitle", "Yagona Imtihon Markazlari")}
        subtitle={t("curriculum.centersSubtitle", "")}
        badge={
          <span className="cur-badge">
            <IconBuildingSkyscraper size={14} /> {centers.length} {t("curriculum.centersCount", "ta markaz")}
          </span>
        }
        savedAt={savedAt}
        fromCache={fromCache}
        refreshing={refreshing}
        onRefresh={refresh}
        searchRef={searchRef}
        sidebar={
          <>
            <div style={{ padding: "10px 10px 6px" }}>
              <CurriculumSearch
                inputRef={searchRef}
                value={search}
                onChange={setSearch}
                placeholder={t("learn.searchCenters", "Hudud yoki manzil...")}
                resultCount={filtered.length}
              />
            </div>
            <SidebarList
              items={filtered.map((c) => ({ id: String(c.id), label: region(c), icon: <IconMapPin size={15} /> }))}
              value={selected ? String(selected.id) : ""}
              onChange={setSelectedId}
              ariaLabel={t("curriculum.centersTitle", "Imtihon markazlari")}
            />
          </>
        }
      >
        <CurriculumState
          loading={isLoading}
          error={error}
          empty={!selected}
          onRetry={refresh}
          emptyText={t("curriculum.emptyCenters", "Imtihon markazlari topilmadi")}
          onClear={search ? () => setSearch("") : undefined}
        >
          {selected && (
            <div className="cur-panel">
              <div className="cur-panel-scroll" style={{ padding: "24px 28px" }}>
                <span className="cur-code">{region(selected)}</span>
                <h2 className="cur-detail-title" style={{ fontSize: 20, margin: "10px 0 20px" }}>
                  {t("learn.centerName", { region: region(selected), defaultValue: "{{region}} imtihon markazi" })}
                </h2>
                <div className="cur-info-list">
                  <div className="cur-info-line">
                    <IconMapPin size={18} />
                    <div>
                      <span className="cur-info-label">{t("learn.address", "Manzil")}</span>
                      {pickLocalized(selected, "address", lang)}
                    </div>
                  </div>
                  {selected.phones && (
                    <div className="cur-info-line">
                      <IconPhone size={18} />
                      <div>
                        <span className="cur-info-label">{t("curriculum.phone", "Telefon")}</span>
                        <span style={{ userSelect: "text" }}>{selected.phones}</span>
                      </div>
                    </div>
                  )}
                  <div className="cur-info-line">
                    <IconClock size={18} />
                    <div>
                      <span className="cur-info-label">{t("curriculum.workHours", "Ish vaqti")}</span>
                      {selected.work_days || t("learn.defaultWorkDays", "Dushanba - Shanba")}: {selected.work_hours || "09:00 - 18:00"}
                    </div>
                  </div>
                  {pickLocalized(selected, "transport", lang) && (
                    <div className="cur-info-line">
                      <IconBus size={18} />
                      <div>
                        <span className="cur-info-label">{t("learn.transport", "Jamoat transporti")}</span>
                        {pickLocalized(selected, "transport", lang)}
                      </div>
                    </div>
                  )}
                  <div className="cur-info-line">
                    <IconReceipt size={18} />
                    <div>
                      <span className="cur-info-label">{t("curriculum.theoryPractical", "Nazariy / Amaliy")}</span>
                      {fmtPrice(selected.price_theory, "100 000")} / {fmtPrice(selected.price_practical, "150 000")} {t("learn.currency", "so'm")}
                    </div>
                  </div>
                </div>
                {isSafeExternalUrl(selected.map_url) && (
                  <button
                    type="button"
                    className="cur-btn primary"
                    style={{ marginTop: 24 }}
                    onClick={() => void openExternal(selected.map_url!)}
                  >
                    <IconExternalLink size={15} /> {t("curriculum.openMap", "Xaritada ochish")}
                  </button>
                )}
              </div>
            </div>
          )}
        </CurriculumState>
      </CurriculumShell>
    </>
  );
}
