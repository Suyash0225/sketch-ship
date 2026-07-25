import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getProfile, ApiError, type CreatorProfile } from "./lib/api";
import { AppStatusProvider } from "./context/AppStatusContext";
import NavBar from "./components/NavBar";
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

  return (
    <div className="min-h-screen bg-slate-950">
      <NavBar hasProfile={hasProfile} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {profileState.status === "error" && (
          <div className="mb-6">
            <ErrorBanner
              message={`Backend unreachable — ${profileState.message}. You can keep browsing; we'll retry.`}
              onRetry={loadProfile}
            />
          </div>
        )}

        {profileState.status === "loading" ? (
          <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
            <Spinner size={22} />
            Connecting to GhostTrace…
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
  );
}

export default function App() {
  return (
    <AppStatusProvider>
      <AppShell />
    </AppStatusProvider>
  );
}
