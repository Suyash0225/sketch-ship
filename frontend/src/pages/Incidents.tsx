import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScanSearch } from "lucide-react";
import { getIncidents, seedLeakUrl, ApiError, type Incident } from "../lib/api";
import PlatformBadge from "../components/PlatformBadge";
import GoogleVisionBadge from "../components/GoogleVisionBadge";
import StatusChip from "../components/StatusChip";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import ScoreRing from "../components/ScoreRing";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getIncidents()
      .then((list) =>
        setIncidents(
          [...list].sort(
            (a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
          )
        )
      )
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load incidents"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Incidents</h1>
        <p className="mt-1 text-sm text-slate-400">
          Leaked or re-uploaded copies of your content, detected by Gemini vision and real Google web searches.
        </p>
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState
          icon={<ScanSearch />}
          title="No incidents detected"
          subtitle='Run a scan from the Dashboard to compare your assets against the monitored web.'
          action={
            <Link
              to="/"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Go to Dashboard
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {incidents.map((incident) => (
            <li key={incident.id}>
              <Link
                to={`/incidents/${incident.id}`}
                className={`flex items-center gap-4 rounded-xl border border-white/10 bg-slate-900/50 p-3 transition hover:border-violet-500/40 hover:bg-slate-900/80 ${
                  incident.status === "DETECTED" ? "animate-ghost-pulse" : ""
                }`}
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-950">
                  <img
                    src={seedLeakUrl(incident.leak_image_path)}
                    alt="Leaked copy"
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <PlatformBadge platform={incident.platform} />
                    {incident.source === "GOOGLE_VISION" && <GoogleVisionBadge size="sm" />}
                    <StatusChip status={incident.status} />
                  </div>
                  <p className="truncate text-sm text-slate-300">{incident.reasoning}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Detected {formatDate(incident.detected_at)}
                  </p>
                </div>

                <ScoreRing score={incident.similarity_score} size={56} strokeWidth={5} caption="match" />

                <span className="shrink-0 text-slate-500">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
