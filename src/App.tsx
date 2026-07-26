import { useState, useEffect } from "react";
import { AppScreen, LicenseStatus, UserResponse, TicketResponse } from "./types";
import { checkLicense, prefetchAll, clearCache, logout, SESSION_EXPIRED_EVENT } from "./api";
import { isLoggedIn, clearTokens } from "./auth";
import { getMe } from "./api";
import LicenseScreen from "./screens/LicenseScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import HomeScreen from "./screens/HomeScreen";
import ExamScreen from "./screens/ExamScreen";
import MarathonScreen from "./screens/MarathonScreen";
import TopicsScreen from "./screens/TopicsScreen";
import StatsScreen from "./screens/StatsScreen";
import BiletlarScreen from "./screens/BiletlarScreen";
import TicketExamScreen from "./screens/TicketExamScreen";
import WrongAnswersScreen from "./screens/WrongAnswersScreen";
import SavedQuestionsScreen from "./screens/SavedQuestionsScreen";
import LicenseBar from "./components/LicenseBar";
import "./App.css";

function App() {
  const [screen, setScreen]               = useState<AppScreen>("license");
  const [licenseStatus, setLicenseStatus]  = useState<LicenseStatus | null>(null);
  const [currentUser, setCurrentUser]     = useState<UserResponse | null>(null);
  const [selectedTopicId, setTopicId]     = useState<number | null>(null);
  const [selectedTicket, setTicket]       = useState<TicketResponse | null>(null);
  const [appReady, setAppReady]           = useState(false);
  const [renewMode, setRenewMode]         = useState(false);

  useEffect(() => {
    const init = async () => {
      // 1) Litsenziya tekshirish
      try {
        const status = await checkLicense();
        if (status.is_valid) {
          setLicenseStatus(status);
          // 2) Token bor bo'lsa → login skip
          if (isLoggedIn()) {
            try {
              const user = await getMe() as UserResponse;
              setCurrentUser(user);
              setScreen("home");
              // 3) Foydalanuvchi kelganidan keyin asosiy ma'lumotlarni kesh'ga oldindan yuklash
              prefetchAll().catch(() => { /* sokin */ });
            } catch {
              clearTokens();
              setScreen("login");
            }
          } else {
            setScreen("login");
          }
        } else {
          setScreen("license");
        }
      } catch {
        setScreen("license");
      }
      setAppReady(true);
    };
    init();
  }, []);

  // Sessiya tugaganda (refresh ham ishlamadi) — ilovani qayta yuklamasdan
  // login ekraniga yumshoq o'tish. Listener unmount'da olib tashlanadi.
  useEffect(() => {
    const onExpired = () => {
      setCurrentUser(null);
      setTicket(null);
      setTopicId(null);
      setScreen("login");
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const handleLicenseActivated = async (status: LicenseStatus) => {
    setLicenseStatus(status);
    setRenewMode(false);
    // Yangilash rejimidan kelgan bo'lsa, foydalanuvchi allaqachon bor
    if (renewMode && currentUser) {
      setScreen("home");
      return;
    }
    if (isLoggedIn()) {
      try {
        const user = await getMe() as UserResponse;
        setCurrentUser(user);
        setScreen("home");
        prefetchAll().catch((e) => console.warn("[prefetchAll] failed:", e));
        return;
      } catch {
        clearTokens();
      }
    }
    setScreen("login");
  };

  const handleLoggedIn = (user: UserResponse) => {
    setCurrentUser(user);
    setScreen("home");
    prefetchAll().catch((e) => console.warn("[prefetchAll] failed:", e));
  };

  const handleLogout = () => {
    // Serverdagi refresh token'ni ham bekor qilamiz — ilgari faqat mahalliy
    // tokenlar o'chirilardi va refresh token serverda tirik qolaverardi.
    logout().catch((e) => console.warn("[App] logout failed:", e));
    clearTokens();
    // Keshda oldingi foydalanuvchining statistikasi/biletlari qolib ketmasin
    clearCache();
    setCurrentUser(null);
    setTicket(null);
    setTopicId(null);
    setScreen("login");
  };

  const handleRenewLicense = () => {
    setRenewMode(true);
    setScreen("license");
  };

  const handleCancelRenew = () => {
    setRenewMode(false);
    setScreen(currentUser ? "home" : "login");
  };

  const nav = (s: AppScreen) => setScreen(s);
  const goHome = () => setScreen("home");

  const startMarathonByTopic = (topicId: number) => {
    setTopicId(topicId);
    setScreen("marathon");
  };

  const startTicketExam = (ticket: TicketResponse) => {
    setTicket(ticket);
    setScreen("ticket-exam");
  };

  if (!appReady) {
    return (
      <div className="app">
        <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  // License bar should appear on every post-license screen
  const showLicenseBar = screen !== "license" && licenseStatus !== null;

  return (
    <div className="app">
      {showLicenseBar && (
        <LicenseBar status={licenseStatus} onRenew={handleRenewLicense} />
      )}
      {screen === "license" && (
        <LicenseScreen
          onActivated={handleLicenseActivated}
          onCancel={renewMode ? handleCancelRenew : undefined}
        />
      )}
      {screen === "login" && (
        <LoginScreen
          onLoggedIn={handleLoggedIn}
          onGoRegister={() => setScreen("register")}
          onForgotPassword={() => setScreen("forgot-password")}
        />
      )}
      {screen === "register" && (
        <RegisterScreen
          onRegistered={handleLoggedIn}
          onGoLogin={() => setScreen("login")}
        />
      )}
      {screen === "forgot-password" && (
        <ForgotPasswordScreen
          onDone={() => setScreen("login")}
          onBack={() => setScreen("login")}
        />
      )}
      {currentUser && screen === "home" && (
        <HomeScreen
          user={currentUser}
          onLogout={handleLogout}
          onNav={nav}
        />
      )}
      {currentUser && screen === "exam" && (
        <ExamScreen onBack={goHome} />
      )}
      {currentUser && screen === "marathon" && (
        <MarathonScreen
          topicId={selectedTopicId}
          onBack={() => { setTopicId(null); goHome(); }}
        />
      )}
      {currentUser && screen === "topics" && (
        <TopicsScreen
          onBack={goHome}
          onStartMarathon={startMarathonByTopic}
        />
      )}
      {currentUser && screen === "stats" && (
        <StatsScreen onBack={goHome} />
      )}
      {currentUser && screen === "biletlar" && (
        <BiletlarScreen
          onBack={goHome}
          onStartTicket={startTicketExam}
        />
      )}
      {currentUser && selectedTicket && screen === "ticket-exam" && (
        <TicketExamScreen
          ticket={selectedTicket}
          onBack={() => setScreen("biletlar")}
        />
      )}
      {currentUser && screen === "wrong-answers" && (
        <WrongAnswersScreen onBack={goHome} />
      )}
      {currentUser && screen === "saved-questions" && (
        <SavedQuestionsScreen onBack={goHome} />
      )}
    </div>
  );
}

export default App;
