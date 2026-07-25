import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getProfile, ApiError, type CreatorProfile } from "./lib/api";
import { AppStatusProvider } from "./context/AppStatusContext";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ErrorBanner from "./components/ErrorBanner";
import Spinner from "./components/Spinner";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Incidents from "./pages/Incidents";
import IncidentRoom from "./pages/IncidentRoom";
import Activity from "./pages/Activity";

type ProfileState =
  | { status: "loading" }
  | { status: "ready"; profile: CreatorProfile | null }
  | { status: "error"; message: string };

function AppShell() {
  const [profileState, setProfileState] = useState<ProfileState>({ status: "loading" });
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const loadProfile = useCallback(() => {
    setProfileState({ status: "loading" });
    getProfile()
      .then((profile) => setProfileState({ status: "ready", profile }))
      .catch((err) =>
        setProfileState({
          status: "error",
          message: err instanceof ApiError ? err.message : "Could not reach the GhostTrace backend.",
        })
      );
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (
      profileState.status === "ready" &&
      profileState.profile === null &&
      location.pathname !== "/onboarding"
    ) {
      navigate("/onboarding", { replace: true });
    }
  }, [profileState, location.pathname, navigate]);

  const hasProfile = profileState.status === "ready" ? !!profileState.profile : null;
  const profile = profileState.status === "ready" ? profileState.profile : null;

  // Route changes must close the mobile drawer, otherwise it stays open over
  // the page the user just navigated to.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    // Admin shell: fixed rail on the left, sticky navbar across the content
    // column, scrolling content underneath.
    <div className="flex min-h-screen">
      <Sidebar hasProfile={hasProfile} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} onOpenMenu={() => setMenuOpen(true)} />

        <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-6 sm:px-7">
          {profileState.status === "error" && (
            <div className="mb-6">
              <ErrorBanner
                message={`Backend unreachable — ${profileState.message}. You can keep browsing; we'll retry.`}
                onRetry={loadProfile}
              />
            </div>
          )}

          {profileState.status === "loading" ? (
            <div className="flex items-center justify-center gap-2.5 py-24 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
              <Spinner size={18} />
              Opening the docket…
            </div>
          ) : (
            <Routes>
              <Route
                path="/onboarding"
                element={
                  <Onboarding
                    onDone={() => {
                      loadProfile();
                      navigate("/");
                    }}
                  />
                }
              />
              <Route path="/" element={<Dashboard />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/incidents/:id" element={<IncidentRoom />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppStatusProvider>
      <AppShell />
    </AppStatusProvider>
  );
}
