import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { OfflineTopic } from "../../types/desktop";
import { getTopics } from "../../services/desktopAdapter";
import { useDesktopTheme } from "../../context/DesktopThemeContext";
import SEO from "../../components/common/SEO";
import {
  IconArrowLeft,
  IconSearch,
  IconBook2,
  IconPlayerPlay,
  IconListNumbers,
} from "@tabler/icons-react";

// Light mode palette
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

// Dark mode palette
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

import { useLanguage } from "../../context/LanguageContext";

export default function Topics_Page() {
  const { t } = useTranslation();
  const { localizeTopic } = useLanguage();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<OfflineTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getTopics()
      .then(setTopics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { theme } = useDesktopTheme();
  const isDark = theme === "dark";

  const onBack = () => navigate("/me");

  const onStartTopicTest = (topicId: number) => {
    navigate(`/marafon?topicId=${topicId}`);
  };

  const filtered = (Array.isArray(topics) ? topics : []).filter((tp) =>
    localizeTopic(tp).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <SEO
        title="Mavzular - YHQ mavzulari bo'yicha testlar"
        description="Yo'l harakati qoidalari mavzulari bo'yicha testlarni yeching. Har bir mavzu bo'yicha alohida tayyorlaning."
        canonical="/topics"
      />
      <div className="topics-screen">
        {/* ── Header ── */}
        <div className="topics-header">
          <button className="quiz-back-btn" onClick={onBack} type="button">
            <IconArrowLeft size={18} />
          </button>
          <h2 className="topics-title">{t("topics.title", "Mavzular")}</h2>
          {!loading && <span className="topics-count-chip">{topics.length}</span>}

          {/* Search */}
          <div className="topics-search-wrap">
            <IconSearch size={15} className="topics-search-icon" />
            <input
              className="topics-search-input"
              placeholder={t("topics.search", "Mavzuni qidirish...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="loading-screen">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 80 }}>
            <div className="empty-state-icon">
              <IconBook2 size={48} stroke={1} color="var(--text-muted)" />
            </div>
            <p className="empty-state-text">
              {search
                ? t("topics.notFound", "Mavzu topilmadi")
                : t("topics.noTopics", "Mavzular mavjud emas")}
            </p>
          </div>
        ) : (
          <div className="topics-grid">
            {filtered.map((topic, idx) => {
              const pal = isDark
                ? PALETTE_DARK[idx % PALETTE_DARK.length]
                : PALETTE[idx % PALETTE.length];

              return (
                <div
                  key={topic.id}
                  className="tpc-card"
                  style={
                    {
                      "--tpc-color": pal.color,
                      "--tpc-bg": pal.bg,
                      "--tpc-border": pal.border,
                    } as React.CSSProperties
                  }
                >
                  {/* Icon + order */}
                  <div className="tpc-icon-wrap">
                    <IconBook2 size={22} stroke={1.5} />
                    <span className="tpc-order">#{idx + 1}</span>
                  </div>

                  {/* Name */}
                  <p className="tpc-name">{localizeTopic(topic)}</p>

                  {/* Question count */}
                  <div className="tpc-meta">
                    <IconListNumbers size={13} />
                    {topic.question_count} {t("common.questions", "savol")}
                  </div>

                  {/* Test button */}
                  <button
                    className="tpc-btn"
                    onClick={() => onStartTopicTest(topic.id)}
                    type="button"
                  >
                    <IconPlayerPlay size={14} />
                    {t("topics.startTest", "Testni boshlash")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
