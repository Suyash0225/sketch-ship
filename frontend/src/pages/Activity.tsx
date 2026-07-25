import { useCallback, useEffect, useState } from "react";
import { Upload, Search, Siren, FileText, Bomb, Download, Radar } from "lucide-react";
import { getActivity, ApiError, type ActivityLogEntry } from "../lib/api";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";

const ACTION_META: Record<string, { icon: typeof Upload; label: string; color: string }> = {
  ASSET_UPLOADED: { icon: Upload, label: "Asset uploaded", color: "text-violet-300 border-violet-500/30" },
  SCAN_RUN: { icon: Search, label: "Scan run", color: "text-blue-300 border-blue-500/30" },
  INCIDENT_DETECTED: { icon: Siren, label: "Incident detected", color: "text-amber-300 border-amber-500/30" },
  DMCA_FILED: { icon: FileText, label: "DMCA filed", color: "text-emerald-300 border-emerald-500/30" },
  NUKE_TRIGGERED: { icon: Bomb, label: "Nuke triggered", color: "text-red-300 border-red-500/30" },
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
          <h1 className="text-2xl font-bold text-white">Activity Log</h1>
          <p className="mt-1 text-sm text-slate-400">Full audit trail — newest first.</p>
        </div>
        <button
          onClick={exportJson}
          disabled={entries.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export JSON
        </button>
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState icon={<Radar />} title="No activity yet" subtitle="Actions you take will show up here in real time." />
      ) : (
        <ol className="relative max-h-[70vh] space-y-0 overflow-y-auto border-l border-white/10 pl-6">
          {entries.map((entry, i) => {
            const meta = ACTION_META[entry.action];
            const Icon = meta?.icon;
            const color = meta?.color ?? "text-slate-300 border-white/20";
            const label = meta?.label ?? entry.action;
            const day = dayLabel(entry.timestamp);
            const showDayHeader = i === 0 || dayLabel(entries[i - 1].timestamp) !== day;
            return (
              <li key={entry.id}>
                {showDayHeader && (
                  <div className="sticky top-0 z-10 -ml-6 mb-3 bg-slate-950/90 py-1 pl-6 backdrop-blur">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{day}</span>
                  </div>
                )}
                <div className="relative pb-6 last:pb-0">
                  <span
                    className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border bg-slate-950 ${color}`}
                  >
                    {Icon ? <Icon className="h-3.5 w-3.5" /> : <span className="text-xs">•</span>}
                  </span>
                  <div className="rounded-lg border border-white/10 bg-slate-900/50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`text-sm font-semibold ${color.split(" ")[0]}`}>
                        {label}
                      </span>
                      <span className="text-xs text-slate-500">{formatDate(entry.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{entry.details}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
