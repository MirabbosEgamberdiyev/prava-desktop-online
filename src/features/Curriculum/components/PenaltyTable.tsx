import { useTranslation } from "react-i18next";
import type { PracticalPenalty } from "../../../api/curriculumApi";
import { useLanguage } from "../../../context/LanguageContext";
import { pickLocalized } from "../localize";

export type PenaltySeverity = "fail" | "major" | "minor";

export function penaltySeverity(points: number): PenaltySeverity {
  if (points >= 100) return "fail";
  if (points >= 20) return "major";
  return "minor";
}

export function PenaltyBadge({ points }: { points: number }) {
  const { t } = useTranslation();
  const sev = penaltySeverity(points);
  const ball = t("curriculum.ball", "ball");
  if (sev === "fail") return <span className="cur-pill fail">{t("curriculum.fail100", "Yiqitish (100 ball)")}</span>;
  if (sev === "major")
    return (
      <span className="cur-pill major">
        {t("curriculum.severityMedium", "Qo'pol")} · {points} {ball}
      </span>
    );
  return (
    <span className="cur-pill minor">
      {t("curriculum.severityMinor", "Kichik")} · {points} {ball}
    </span>
  );
}

/** Penalty points table (Penalties page + Practical exam page). */
export default function PenaltyTable({ penalties }: { penalties: PracticalPenalty[] }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  return (
    <div className="cur-rows" role="table" aria-label={t("curriculum.tabPenalties", "Jarima ballari jadvali")}>
      <div className="cur-row cur-row-head" role="row">
        <span role="columnheader">{t("curriculum.colNumber", "#")}</span>
        <span role="columnheader">{t("curriculum.colViolation", "Qoidabuzarlik holati")}</span>
        <span role="columnheader">{t("curriculum.colPoints", "Jarima balli")}</span>
      </div>
      {penalties.map((p) => (
        <div key={p.id} className="cur-row" role="row">
          <span className="cur-row-num" role="cell">
            {p.penalty_number}
          </span>
          <span role="cell">{pickLocalized(p, "text", lang)}</span>
          <span role="cell">
            <PenaltyBadge points={p.points} />
          </span>
        </div>
      ))}
    </div>
  );
}
