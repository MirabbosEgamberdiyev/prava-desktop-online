import { LeaderboardPage } from "../../features/Leaderboard";
import SEO from "../../components/common/SEO";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconArrowLeft, IconTrophy } from "@tabler/icons-react";
import { Container } from "@mantine/core";

const Leaderboard_Page = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <SEO
        title="Reyting - Eng yaxshi natijalar"
        description="Prava Online platformasida eng yaxshi natijalarni ko'rsatgan foydalanuvchilar reytingi."
        canonical="/leaderboard"
        noIndex={true}
      />
      <div className="review-screen">
        <header className="review-header">
          <button
            className="review-back-btn"
            onClick={() => navigate("/me")}
            type="button"
          >
            <IconArrowLeft size={18} stroke={2} />
            {t("common.back", "Orqaga")}
          </button>
          <div className="review-header-title">
            <IconTrophy size={20} stroke={2} color="var(--mantine-color-yellow-5)" />
            <span>{t("leaderboard.title", "Peshqadamlar reytingi")}</span>
          </div>
        </header>
        <main style={{ flex: 1, overflowY: "auto", padding: "14px 16px 32px" }}>
          <Container size="lg">
            <LeaderboardPage />
          </Container>
        </main>
      </div>
    </>
  );
};

export default Leaderboard_Page;
