import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Route guard that allows only SUPER_ADMIN users.
 * Redirects authenticated non-admins to "/" with a 403-style state.
 * Redirects unauthenticated users to the login page.
 */
const AdminRoute: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // The User type now optionally carries a role field populated from the backend response.
  const role = (user as { role?: string } | null)?.role;
  if (role !== "SUPER_ADMIN") {
    return <Navigate to="/" state={{ forbidden: true }} replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
