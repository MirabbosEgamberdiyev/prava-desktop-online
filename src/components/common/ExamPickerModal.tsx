import { useTranslation } from "react-i18next";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSelect: (count: number) => void;
}

export const EXAM_OPTIONS = [20, 40, 50, 60, 80, 100];

export default function ExamPickerModal({ opened, onClose, onSelect }: Props) {
  const { t } = useTranslation();

  if (!opened) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card exam-picker-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{t("exam.howManyQuestions", "Nechta savoldan imtihon?")}</h3>
        <div className="exam-picker-grid">
          {EXAM_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              className="exam-picker-btn"
              onClick={() => onSelect(count)}
            >
              <span className="exam-picker-num">{count}</span>
              <span className="exam-picker-label">{t("exam.questionsUnit", "ta savol")}</span>
              <span className="exam-picker-time">{count} {t("exam.minuteShort", "daq")}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="modal-btn-cancel"
          style={{ width: "100%" }}
          onClick={onClose}
        >
          {t("common.cancel") || "Bekor qilish"}
        </button>
      </div>
    </div>
  );
}
