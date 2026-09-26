import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconAlertOctagon, IconChevronLeft, IconChevronRight, IconSteeringWheel } from "@tabler/icons-react";
import SEO from "../../components/common/SEO";
import { useLanguage } from "../../context/LanguageContext";
import type { PracticalExercise } from "../../api/curriculumApi";
import { useCurriculum } from "../../features/Curriculum/useCurriculum";
import { pickLocalized } from "../../features/Curriculum/localize";
import { CurriculumShell, CurriculumState } from "../../features/Curriculum/components/CurriculumShell";
import SidebarList from "../../features/Curriculum/components/SidebarList";
import PenaltyTable from "../../features/Curriculum/components/PenaltyTable";
import SecureImage from "../../components/common/SecureImage";
import { PRACTICAL_EXERCISES_FALLBACK } from "../../features/Curriculum/practicalFallback";

const PENALTIES_ID = "penalties";

/** Server exercises, or the official 12 built-in exercises when the server has none / offline first run. */
function withFallback(list: PracticalExercise[] | undefined): PracticalExercise[] {
  if (list && list.length > 0) return [...list].sort((a, b) => a.exercise_number - b.exercise_number);
  return PRACTICAL_EXERCISES_FALLBACK.map((f) => ({
    id: f.number,
    exercise_number: f.number,
    title_uzl: f.title.uzl,
    title_uzc: f.title.uzc,
    title_ru: f.title.ru,
    description_uzl: f.description.uzl,
    description_uzc: f.description.uzc,
    description_ru: f.description.ru,
  }));
}

export default function PracticalExam_Page() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const { data, error, isLoading, refresh, refreshing, savedAt, fromCache } = useCurriculum("practical");
  const exercises = useMemo(() => withFallback(data?.exercises), [data]);
  const penalties = useMemo(() => [...(data?.penalties ?? [])].sort((a, b) => a.penalty_number - b.penalty_number), [data]);
  const [selected, setSelected] = useState<string>("");
  const [params] = useSearchParams();
  const deepId = params.get("id");
  useEffect(() => {
    if (deepId) setSelected(deepId);
  }, [deepId]);

  const fallbackFor = (e: PracticalExercise) => PRACTICAL_EXERCISES_FALLBACK.find((x) => x.number === e.exercise_number);
  const exTitle = (e: PracticalExercise) => pickLocalized(e, "title", lang) || fallbackFor(e)?.title[lang] || "";
  const exDesc = (e: PracticalExercise) => pickLocalized(e, "description", lang) || fallbackFor(e)?.description[lang] || "";

  const activeId = selected || (exercises[0] ? String(exercises[0].id) : PENALTIES_ID);
  const exIndex = exercises.findIndex((e) => String(e.id) === activeId);
  const exercise = exIndex >= 0 ? exercises[exIndex] : null;

  const sidebarItems = [
    ...exercises.map((e) => ({ id: String(e.id), label: exTitle(e), count: e.exercise_number })),
    {
      id: PENALTIES_ID,
      label: t("curriculum.tabPenalties", "Jarima ballari jadvali"),
      icon: <IconAlertOctagon size={15} />,
      count: penalties.length || undefined,
    },
  ];

  return (
    <>
      <SEO title={t("curriculum.autodromTitle", "Avtodrom")} description={t("curriculum.autodromSubtitle", "")} canonical="/practical-exam" noIndex />
      <CurriculumShell
        section="practical-exam"
        title={t("curriculum.autodromTitle", "Avtodrom & Amaliy mashqlar")}
        subtitle={t("curriculum.autodromSubtitle", "")}
        badge={
          <span className="cur-badge">
            <IconSteeringWheel size={14} /> {exercises.length} / {penalties.length}
          </span>
        }
        savedAt={savedAt}
        fromCache={fromCache}
        refreshing={refreshing}
        onRefresh={refresh}
        sidebar={
          <>
            <div className="cur-sidebar-head">{t("curriculum.tabExercises", "Avtodrom mashqlari")}</div>
            <SidebarList items={sidebarItems} value={activeId} onChange={setSelected} ariaLabel={t("curriculum.tabExercises", "Avtodrom mashqlari")} />
          </>
        }
      >
        {exercise ? (
          <div className="cur-panel">
            <div className="cur-panel-scroll" style={{ padding: "24px 28px" }}>
              <span className="cur-code">
                {t("learn.exercise", "Mashq")} {exercise.exercise_number} / {exercises.length}
              </span>
              <h2 className="cur-detail-title" style={{ fontSize: 20, margin: "10px 0 14px" }}>
                {exTitle(exercise)}
              </h2>
              {exercise.image_url && (
                <div className="cur-detail-media" style={{ borderRadius: 12, marginBottom: 16, height: 240 }}>
                  <SecureImage path={exercise.image_url} alt={exTitle(exercise)} />
                </div>
              )}
              <p className="cur-html" style={{ marginBottom: 16 }}>
                {exDesc(exercise)}
              </p>
              {exercise.max_penalty_points != null && (
                <p className="cur-detail-meta" style={{ marginBottom: 16 }}>
                  {t("curriculum.maxPenalty", "Maksimal jarima balli")}: {exercise.max_penalty_points}
                </p>
              )}
              <div className="cur-notice">
                <strong>{t("curriculum.autodromNoticeTitle", "Amaliy imtihon qoidalari")}</strong>
                <div style={{ marginTop: 4 }}>{t("curriculum.autodromNoticeText", "")}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <button type="button" className="cur-btn" disabled={exIndex <= 0} onClick={() => setSelected(String(exercises[exIndex - 1].id))}>
                  <IconChevronLeft size={15} /> {t("learn.prev", "Oldingi")}
                </button>
                <button
                  type="button"
                  className="cur-btn"
                  onClick={() => setSelected(exIndex < exercises.length - 1 ? String(exercises[exIndex + 1].id) : PENALTIES_ID)}
                >
                  {t("learn.next", "Keyingi")} <IconChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <CurriculumState
            loading={isLoading}
            error={error}
            empty={penalties.length === 0}
            onRetry={refresh}
            emptyText={t("curriculum.emptyPenalties", "Jarima ma'lumotlari topilmadi")}
          >
            <div className="cur-panel">
              <div className="cur-panel-scroll">
                <PenaltyTable penalties={penalties} />
              </div>
            </div>
          </CurriculumState>
        )}
      </CurriculumShell>
    </>
  );
}
