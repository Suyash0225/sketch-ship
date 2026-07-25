import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Search, Siren, FileText, Bomb, Download, Radar, ChevronRight } from "lucide-react";
import { getActivity, ApiError, type ActivityLogEntry } from "../lib/api";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";

const ACTION_META: Record<string, { icon: typeof Upload; label: string; color: string }> = {
  ASSET_UPLOADED: { icon: Upload, label: "Exhibit entered", color: "text-ink" },
  SCAN_RUN: { icon: Search, label: "Sweep run", color: "text-azure" },
  INCIDENT_DETECTED: { icon: Siren, label: "Case opened", color: "text-brass" },
  DMCA_FILED: { icon: FileText, label: "DMCA filed", color: "text-iris" },
  NUKE_TRIGGERED: { icon: Bomb, label: "Filed everywhere", color: "text-crimson" },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function Activity() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getActivity()
      .then((list) =>
        setEntries(
          [...list].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        )
      )
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load activity"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ghosttrace-activity-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-iris">Audit trail · newest first</p>
          <h1 className="display mt-2 text-[27px] text-ink">Activity</h1>
        </div>
        <button
          onClick={exportJson}
          disabled={entries.length === 0}
          className="btn btn-secondary font-mono text-[11px] tracking-[0.08em]"
        >
          <Download className="h-3.5 w-3.5" /> EXPORT EVIDENCE JSON
        </button>
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState icon={<Radar />} title="Nothing on record" subtitle="Actions you take will be entered here in real time." />
      ) : (
        <ol className="surface max-h-[70vh] overflow-y-auto">
          {entries.map((entry, i) => {
            const meta = ACTION_META[entry.action];
            const Icon = meta?.icon;
            const color = meta?.color ?? "text-ink-soft";
            const label = meta?.label ?? entry.action;
            const day = dayLabel(entry.timestamp);
            const showDayHeader = i === 0 || dayLabel(entries[i - 1].timestamp) !== day;
            const lineNo = String(entries.length - i).padStart(3, "0");
            const body = (
              <>
                <span className="w-10 shrink-0 pt-0.5 font-mono text-[10px] tabular-nums text-ink-faint">
                  {lineNo}
                </span>
                <span className={`shrink-0 pt-0.5 ${color}`}>
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className={`text-[13px] font-bold ${color}`}>{label}</span>
                    <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                      {formatDate(entry.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11.5px] leading-relaxed text-ink-soft">
                    {entry.details}
                  </p>
                </div>
              </>
            );
            return (
              <li key={entry.id}>
                {showDayHeader && (
                  <div className="chrome sticky top-0 z-10 px-4 py-1.5">
                    <span className="text-[12px] font-medium text-ink-soft">{day}</span>
                  </div>
                )}
                {entry.incident_id ? (
                  <Link
                    to={`/incidents/${entry.incident_id}`}
                    className="group flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0 transition hover:bg-well/50"
                  >
                    {body}
                    <ChevronRight className="h-4 w-4 shrink-0 self-center text-ink-faint transition group-hover:text-crimson" />
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
