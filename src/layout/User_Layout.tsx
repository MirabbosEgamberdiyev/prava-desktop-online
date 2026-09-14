import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { UserRouteFallback } from "../components/common/RouteContentFallback";
import { OfflineBanner } from "../components/common/OfflineBanner";

const User_Layout = () => {
  const location = useLocation();

  return (
    <div className="app" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <OfflineBanner />
      <div
        className="page-transition-wrapper"
        key={location.pathname}
        style={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <Suspense fallback={<UserRouteFallback />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
};

export default User_Layout;
