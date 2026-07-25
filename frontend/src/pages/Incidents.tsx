import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScanSearch, ExternalLink } from "lucide-react";
import { getIncidents, seedLeakUrl, ApiError, type Incident } from "../lib/api";
import PlatformBadge from "../components/PlatformBadge";
import GoogleVisionBadge from "../components/GoogleVisionBadge";
import StatusChip from "../components/StatusChip";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import ScoreRing from "../components/ScoreRing";
import { caseNo, formatDate } from "../lib/format";

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
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          Infringement matters, newest first
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight text-ink">Open Cases</h1>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ink-soft">
          Leaked or re-uploaded copies of your work, detected by Gemini vision and real
          Google web searches. Each case carries the evidence needed to file.
        </p>
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState
          icon={<ScanSearch />}
          title="No cases open"
          subtitle="Run a sweep from the Docket to compare your exhibits against the monitored web."
          action={
            <Link
              to="/"
              className="border-2 border-ink bg-ink px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-paper transition hover:border-crimson hover:bg-crimson"
            >
              Go to the Docket
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {incidents.map((incident) => (
            <li key={incident.id}>
              <Link
                to={`/incidents/${incident.id}`}
                className={`flex items-center gap-4 border border-line border-l-4 bg-card p-3 transition hover:border-l-crimson hover:shadow-[3px_3px_0_0_rgba(33,29,20,0.12)] ${
                  incident.status === "DETECTED"
                    ? "animate-ghost-pulse border-l-crimson"
                    : "border-l-line"
                }`}
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden border border-line bg-well">
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
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-semibold text-ink">
                      Case {caseNo(incident.id)}
                    </span>
                    <PlatformBadge platform={incident.platform} size="sm" />
                    {incident.source === "GOOGLE_VISION" && <GoogleVisionBadge size="sm" />}
                    <StatusChip status={incident.status} />
                  </div>
                  <p className="truncate font-display text-sm italic text-ink-soft">
                    “{incident.reasoning}”
                  </p>
                  {/* not an <a>: anchors can't nest inside the row's Link */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(incident.leak_url, "_blank", "noopener,noreferrer");
                    }}
                    className="mt-1 flex w-full cursor-pointer items-center gap-1 truncate text-left text-[11px] text-ink-faint hover:text-crimson hover:underline"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{incident.leak_url}</span>
                  </button>
                  <p className="mt-1 text-[11px] tabular-nums text-ink-faint">
                    Detected {formatDate(incident.detected_at)}
                  </p>
                </div>

                <ScoreRing score={incident.similarity_score} size={56} strokeWidth={5} caption="match" />

                <span className="shrink-0 text-ink-faint">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
