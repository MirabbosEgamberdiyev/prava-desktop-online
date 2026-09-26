import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { UserRouteFallback } from "../components/common/RouteContentFallback";
import Sidebar from "../shell/Sidebar";
import { useShellFocusMode } from "../shell/focusMode";
import { isExamPath } from "../shell/routes";
import { useExamStatus } from "../state/statusBarStore";

/**
 * Authenticated desktop layout: left navigation rail + page content.
 * The rail is hidden in focus mode — requested by exam pages (`setFocusMode` /
 * `useFocusModeWhile`), while an exam status is published, or on quiz routes.
 */
const User_Layout = () => {
  const location = useLocation();
  const focusRequested = useShellFocusMode();
  const examActive = useExamStatus() !== null;
  // /marafon starts on a setup screen → hidden only once the quiz publishes its status.
  const quizRoute = isExamPath(location.pathname) && location.pathname !== "/marafon";
  const focus = focusRequested || examActive || quizRoute;

  return (
    <div className={`app shell-layout${focus ? " is-focus" : ""}`}>
      {!focus && <Sidebar />}
      <main className="shell-main" id="main-content">
        <div className="page-transition-wrapper shell-page" key={location.pathname}>
          <Suspense fallback={<UserRouteFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default User_Layout;
