import { lazy, Suspense, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { nprogress } from "@mantine/nprogress";
import ProtectedRoute from "../auth/ProtectedRoute";
import AdminRoute from "../auth/AdminRoute";
import App_Layout from "../layout/App_Layout";
import User_Layout from "../layout/User_Layout";

const Home_Page = lazy(() => import("../page/Home"));
const Login_Page = lazy(() => import("../page/Auth/login"));
const Register_Page = lazy(() => import("../page/Auth/register"));
const ForgotPassword_Page = lazy(() => import("../page/Auth/forgot-password"));
const TelegramCallback_Page = lazy(() => import("../page/Auth/telegram-callback"));
const User_Page = lazy(() => import("../page/me"));
const Packages_Page = lazy(() => import("../page/Packages"));
const PackageExamPage = lazy(() => import("../page/Packages/ExamPage"));
const Tickets_Page = lazy(() => import("../page/Ticket"));
const TicketExamPage = lazy(() => import("../page/Ticket/ExamPage"));
const Marafon_Page = lazy(() => import("../page/Marafon"));
const Exam_Page = lazy(() => import("../page/Exam"));
const ExamResult_Page = lazy(() => import("../page/ExamResult"));
const History_Page = lazy(() => import("../page/History"));
const Leaderboard_Page = lazy(() => import("../page/Leaderboard"));
const Settings_Page = lazy(() => import("../page/Settings"));
const Statistics_Page = lazy(() => import("../page/Statistics"));
const Topics_Page = lazy(() => import("../page/Topics"));
const TopicDetail_Page = lazy(() => import("../page/Topics/TopicDetail"));
const GuestExam_Page = lazy(() => import("../page/GuestExam"));
const NotFound_Page = lazy(() => import("../page/Notfound/404"));
const PaymentSuccessPage = lazy(() => import("../payment/PaymentSuccessPage"));
const ActivationCodesPage = lazy(() => import("../page/Admin/ActivationCodes"));
const Downloads_Page      = lazy(() => import("../page/Downloads"));
const Partners_Page       = lazy(() => import("../page/Partners"));
const About_Page          = lazy(() => import("../page/About"));
const Contact_Page        = lazy(() => import("../page/Contact"));
const FAQ_Page            = lazy(() => import("../page/FAQ"));
const Terms_Page          = lazy(() => import("../page/Legal/Terms"));
const Privacy_Page        = lazy(() => import("../page/Legal/Privacy"));
const WrongAnswers_Page   = lazy(() => import("../page/WrongAnswers"));
const WrongExam_Page      = lazy(() => import("../page/WrongExam"));
const SavedQuestions_Page = lazy(() => import("../page/SavedQuestions"));

/**
 * `@mantine/nprogress` package.json da bor edi, lekin kodda HECH QAYERDA
 * ishlatilmagan (o'lik bog'liqlik). Endi u haqiqiy holatga ulandi:
 * Suspense fallback aynan lazy route chunki yuklanayotgan paytda mount
 * bo'ladi, shuning uchun progress bar aniq shu oraliqni ko'rsatadi.
 *
 * Foyda: sekin 3G/4G da yangi sahifaga o'tish "osilib qolgandek" tuyulmaydi —
 * foydalanuvchi darhol vizual javob oladi (native-web feel).
 */
function RootLoadingFallback() {
  useEffect(() => {
    nprogress.start();
    return () => {
      nprogress.complete();
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div className="spinner" />
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<RootLoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<App_Layout />}>
          <Route index element={<Home_Page />} />
          <Route path="partners" element={<Partners_Page />} />
          <Route path="pricing" element={<Partners_Page />} />
          <Route path="downloads" element={<Downloads_Page />} />
          <Route path="about" element={<About_Page />} />
          <Route path="contact" element={<Contact_Page />} />
          <Route path="faq" element={<FAQ_Page />} />
          <Route path="terms" element={<Terms_Page />} />
          <Route path="privacy" element={<Privacy_Page />} />
        </Route>

        <Route path="/try-exam" element={<GuestExam_Page />} />

        {/* Auth Routes */}
        <Route path="/auth" element={<App_Layout />}>
          <Route path="login" element={<Login_Page />} />
          <Route path="register" element={<Register_Page />} />
          <Route path="forgot-password" element={<ForgotPassword_Page />} />
          <Route path="telegram-callback" element={<TelegramCallback_Page />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<User_Layout />}>
            <Route path="/me" element={<User_Page />} />
            <Route path="/packages" element={<Packages_Page />} />
            <Route path="/tickets" element={<Tickets_Page />} />
            <Route path="/history" element={<History_Page />} />
            <Route path="/leaderboard" element={<Leaderboard_Page />} />
            <Route path="/statistics" element={<Statistics_Page />} />
            <Route path="/settings" element={<Settings_Page />} />
            <Route path="/wrong-answers" element={<WrongAnswers_Page />} />
            <Route path="/saved-questions" element={<SavedQuestions_Page />} />
            <Route path="/exam/result/:sessionId" element={<ExamResult_Page />} />
            <Route path="/topics" element={<Topics_Page />} />
            <Route path="/topics/:topicCode" element={<TopicDetail_Page />} />
            <Route path="/tickets/:id" element={<TicketExamPage />} />
            <Route path="/packages/:id" element={<PackageExamPage />} />
            <Route path="/marafon" element={<Marafon_Page />} />
            <Route path="/exam" element={<Exam_Page />} />
            <Route path="/wrong-exam" element={<WrongExam_Page />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
          </Route>
        </Route>

        {/* SUPER_ADMIN only routes */}
        <Route element={<AdminRoute />}>
          <Route element={<User_Layout />}>
            <Route path="/admin/activation-codes" element={<ActivationCodesPage />} />
          </Route>
        </Route>

        {/* 404 Not Found */}
        <Route element={<App_Layout />}>
          <Route path="*" element={<NotFound_Page />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
