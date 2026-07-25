import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScanSearch, ExternalLink } from "lucide-react";
import { getIncidents, seedLeakUrl, ApiError, type Incident } from "../lib/api";
import PlatformBadge from "../components/PlatformBadge";
import SourceBadge from "../components/SourceBadge";
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
        <p className="eyebrow text-iris">Case files · newest first</p>
        <h1 className="display mt-2 text-[27px] text-ink">Incidents</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
          Leaked or re-uploaded copies of your work, found by Gemini vision and real
          Google reverse-image searches. Each case carries the evidence needed to file.
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
            <Link to="/" className="btn btn-primary">
              Go to overview
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {incidents.map((incident) => (
            <li key={incident.id}>
              <Link
                to={`/incidents/${incident.id}`}
                className={`surface surface-hover flex items-center gap-3.5 border-l-2 p-3 ${
                  incident.status === "DETECTED" ? "border-l-brass" : "border-l-transparent"
                }`}
              >
                <div className="h-[70px] w-[70px] shrink-0 overflow-hidden rounded-[10px] border border-line bg-well">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-iris-soft">
                      CASE {caseNo(incident.id)}
                    </span>
                    <SourceBadge source={incident.source} size="sm" />
                    <StatusChip status={incident.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="truncate text-[15px] font-bold text-ink">
                      {incident.reasoning}
                    </p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <PlatformBadge platform={incident.platform} size="sm" />
                    {/* not an <a>: anchors can't nest inside the row's Link */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(incident.leak_url, "_blank", "noopener,noreferrer");
                      }}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left font-mono text-[10px] text-ink-faint transition hover:text-iris-soft"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{incident.leak_url}</span>
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-[10px] tabular-nums text-ink-faint">
                    Detected {formatDate(incident.detected_at)}
                  </p>
                </div>

                <ScoreRing
                  score={incident.similarity_score}
                  size={62}
                  strokeWidth={5}
                  caption="match"
                />

                <span className="shrink-0 text-ink-faint">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
