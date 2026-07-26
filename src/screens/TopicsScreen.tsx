import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { TopicResponse, LocalizedText } from "../types";
import { getTopics } from "../api";
import { useTheme } from "../ThemeContext";
import {
  IconArrowLeft, IconSearch, IconBook2,
  IconPlayerPlay, IconListNumbers,
} from "@tabler/icons-react";

interface Props {
  onBack: () => void;
  onStartMarathon: (topicId: number) => void;
}

const PALETTE = [
  { bg: "#e7f5ff", color: "#1971c2", border: "#74c0fc" },
  { bg: "#ebfbee", color: "#2f9e44", border: "#8ce99a" },
  { bg: "#fff3bf", color: "#e67700", border: "#ffd43b" },
  { bg: "#f3f0ff", color: "#6741d9", border: "#b197fc" },
  { bg: "#e3fafc", color: "#0c8599", border: "#66d9e8" },
  { bg: "#fff0f6", color: "#c2255c", border: "#f783ac" },
  { bg: "#fff4e6", color: "#e8590c", border: "#ffa94d" },
  { bg: "#e6fcf5", color: "#099268", border: "#63e6be" },
  { bg: "#f8f0fc", color: "#9c36b5", border: "#da77f2" },
  { bg: "#fff5f5", color: "#e03131", border: "#ffa8a8" },
];

const PALETTE_DARK = [
  { bg: "#1864ab22", color: "#74c0fc", border: "#1971c240" },
  { bg: "#2f9e4422", color: "#8ce99a", border: "#2f9e4440" },
  { bg: "#e6770022", color: "#ffd43b", border: "#e6770040" },
  { bg: "#6741d922", color: "#b197fc", border: "#6741d940" },
  { bg: "#0c859922", color: "#66d9e8", border: "#0c859940" },
  { bg: "#c2255c22", color: "#f783ac", border: "#c2255c40" },
  { bg: "#e8590c22", color: "#ffa94d", border: "#e8590c40" },
  { bg: "#09926822", color: "#63e6be", border: "#09926840" },
  { bg: "#9c36b522", color: "#da77f2", border: "#9c36b540" },
  { bg: "#e0313122", color: "#ffa8a8", border: "#e0313140" },
];

function getLocal(lt?: LocalizedText | null): string {
  if (!lt) return "";
  const l = i18n.language;
  if (l === "uzc" && lt.uzc) return lt.uzc;
  if (l === "ru" && lt.ru) return lt.ru;
  if (l === "en" && lt.en) return lt.en;
  return lt.uzl || lt.uzc || lt.ru || lt.en || "";
}

function topicName(tp: TopicResponse): string {
  const lt: LocalizedText = { uzl: tp.nameUzl, uzc: tp.nameUzc, ru: tp.nameRu, en: tp.nameEn };
  return getLocal(lt) || String(tp.id);
}

export default function TopicsScreen({ onBack, onStartMarathon }: Props) {
  const { t } = useTranslation();
  const [topics, setTopics]   = useState<TopicResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    getTopics()
      .then(setTopics)
      .catch((e) => console.warn("[TopicsScreen] getTopics failed:", e))
      .finally(() => setLoading(false));
  }, []);

  // ⚠️ Ilgari bu qiymat render vaqtida to'g'ridan-to'g'ri DOM'dan o'qilardi
  // (document.documentElement.getAttribute). U holda mavzu almashtirilganda
  // bu ekran qayta render bo'lmasdi va kartochkalar eski palitrada qolib ketardi.
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((tp) => topicName(tp).toLowerCase().includes(q));
    // i18n.language ham hisobga olinadi: til almashsa mavzu nomlari o'zgaradi
    // va filtr natijasi ham qayta hisoblanishi kerak.
  }, [topics, search, i18n.language]);

  return (
    <div className="topics-screen">
      <div className="topics-header">
        <button type="button" className="quiz-back-btn" onClick={onBack} aria-label={t("common.back")}>
          <IconArrowLeft size={18} />
        </button>
        <h2 className="topics-title">{t("topics.title")}</h2>
        {/* Qidiruv yoqilganda chip topilganlar sonini ko'rsatadi — ilgari
            har doim umumiy son turardi va ro'yxatdagi son bilan mos kelmasdi. */}
        {!loading && <span className="topics-count-chip">{search.trim() ? filtered.length : topics.length}</span>}
        <div className="topics-search-wrap">
          <IconSearch size={15} className="topics-search-icon" />
          <input
            type="search"
            className="topics-search-input"
            placeholder={t("topics.search")}
            aria-label={t("topics.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              // Escape — qidiruvni tozalash (desktopda kutiladigan xatti-harakat)
              if (e.key === "Escape" && search) { e.preventDefault(); setSearch(""); }
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 80 }}>
          <div className="empty-state-icon"><IconBook2 size={48} stroke={1} color="var(--text-muted)" /></div>
          <p className="empty-state-text">{search ? t("topics.notFound") : t("topics.noTopics")}</p>
        </div>
      ) : (
        <div className="topics-grid">
          {filtered.map((topic, idx) => {
            const pal = isDark ? PALETTE_DARK[idx % PALETTE_DARK.length] : PALETTE[idx % PALETTE.length];
            return (
              <div
                key={topic.id}
                className="tpc-card"
                style={{ "--tpc-color": pal.color, "--tpc-bg": pal.bg, "--tpc-border": pal.border } as React.CSSProperties}
              >
                <div className="tpc-icon-wrap">
                  <IconBook2 size={22} stroke={1.5} />
                  <span className="tpc-order">#{idx + 1}</span>
                </div>
                <p className="tpc-name">{topicName(topic)}</p>
                <div className="tpc-meta">
                  <IconListNumbers size={13} />
                  {topic.questionCount ?? 0} {t("common.questions")}
                </div>
                <button
                  type="button"
                  className="tpc-btn"
                  onClick={() => onStartMarathon(topic.id)}
                  aria-label={`${t("topics.startMarathon")} — ${topicName(topic)}`}
                >
                  <IconPlayerPlay size={14} />
                  {t("topics.startMarathon")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
