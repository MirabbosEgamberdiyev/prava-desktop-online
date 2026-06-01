import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { UserResponse, TopicResponse, LocalizedText } from "../types";
import { getTopics } from "../api";
import {
  IconArrowLeft, IconSearch, IconBook2,
  IconPlayerPlay, IconListNumbers,
} from "@tabler/icons-react";

interface Props {
  user: UserResponse;
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  const filtered = topics.filter((tp) =>
    topicName(tp).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="topics-screen">
      <div className="topics-header">
        <button className="quiz-back-btn" onClick={onBack}>
          <IconArrowLeft size={18} />
        </button>
        <h2 className="topics-title">{t("topics.title")}</h2>
        {!loading && <span className="topics-count-chip">{topics.length}</span>}
        <div className="topics-search-wrap">
          <IconSearch size={15} className="topics-search-icon" />
          <input
            className="topics-search-input"
            placeholder={t("topics.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                <button className="tpc-btn" onClick={() => onStartMarathon(topic.id)}>
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
