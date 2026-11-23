import { AnimatePresence } from "framer-motion";
import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { FullScreenLoader } from "./components/layout/FullScreenLoader";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LoginPage } from "./pages/Login";
import { ResetPasswordPage } from "./pages/ResetPassword";
import { useAuth } from "./store/auth";

const DashboardPage = lazy(() => import("./pages/Dashboard"));
const RadarPage = lazy(() => import("./pages/Radar"));
const StudioPage = lazy(() => import("./pages/Studio"));
const PipelinePage = lazy(() => import("./pages/Pipeline"));
const BrandPage = lazy(() => import("./pages/Brand"));
const TrendsPage = lazy(() => import("./pages/Trends"));
const VideoPage = lazy(() => import("./pages/Video"));
const GraphicsPage = lazy(() => import("./pages/Graphics"));
const MediaPage = lazy(() => import("./pages/Media"));
const SettingsPage = lazy(() => import("./pages/Settings"));

export function App() {
  const init = useAuth((s) => s.init);
  const status = useAuth((s) => s.status);
  const location = useLocation();

  useEffect(() => {
    void init();
  }, [init]);

  if (status === "loading") return <FullScreenLoader />;

  return (
    <AnimatePresence mode="wait">
      <Routes location={location}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route
              index
              element={
                <Suspense fallback={null}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route path="trends" element={<Suspense fallback={null}><TrendsPage /></Suspense>} />
            <Route path="graphics" element={<Suspense fallback={null}><GraphicsPage /></Suspense>} />
            <Route path="media" element={<Suspense fallback={null}><MediaPage /></Suspense>} />
            <Route path="video" element={<Suspense fallback={null}><VideoPage /></Suspense>} />
            <Route path="radar" element={<Suspense fallback={null}><RadarPage /></Suspense>} />
            <Route path="studio" element={<Suspense fallback={null}><StudioPage /></Suspense>} />
            <Route path="pipeline" element={<Suspense fallback={null}><PipelinePage /></Suspense>} />
            <Route path="brand" element={<Suspense fallback={null}><BrandPage /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={null}><SettingsPage /></Suspense>} />
          </Route>
        </Route>
        {/* Any unknown URL: authenticated → dashboard, otherwise ProtectedRoute sends to /login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
