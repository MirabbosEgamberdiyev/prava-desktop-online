import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { UserRouteFallback } from "../components/common/RouteContentFallback";

const User_Layout = () => {
  const location = useLocation();

  return (
    <div className="app">
      <div
        className="page-transition-wrapper"
        key={location.pathname}
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Suspense fallback={<UserRouteFallback />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
};

export default User_Layout;
