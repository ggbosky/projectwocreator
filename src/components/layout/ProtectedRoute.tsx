import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data";
import { FullScreenLoader } from "./FullScreenLoader";

/**
 * Route guard: renders nothing of the app (not even the shell) until the user
 * is authenticated. Unauthenticated users are redirected to /login and sent
 * back to the originally requested URL after sign-in.
 */
export function ProtectedRoute() {
  const status = useAuth((s) => s.status);
  const location = useLocation();
  const { ready, load, clear } = useData();

  useEffect(() => {
    if (status === "authenticated" && !ready) void load();
    if (status === "unauthenticated") clear();
  }, [status, ready, load, clear]);

  if (status === "loading") return <FullScreenLoader />;
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}
