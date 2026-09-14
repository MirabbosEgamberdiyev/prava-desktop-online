import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { UserRouteFallback } from "../components/common/RouteContentFallback";

const User_Layout = () => {
  const location = useLocation();

  return (
    <div className="app" style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
      <div
        className="page-transition-wrapper"
        key={location.pathname}
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <Suspense fallback={<UserRouteFallback />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
};

export default User_Layout;
