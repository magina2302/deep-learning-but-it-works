import { useAuth } from "./AuthContext";
import { Navigate, Outlet } from "react-router";

export function AuthGuard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
