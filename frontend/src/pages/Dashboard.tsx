import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Search, Siren, FileText, Bomb, Image, CheckCircle2, Radar } from "lucide-react";
import {
  postScan,
  getActivity,
  ApiError,
  type ActivityLogEntry,
} from "../lib/api";
import { useAppStatus } from "../context/AppStatusContext";
import { useToast } from "../context/ToastContext";
import StatCard from "../components/StatCard";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";

const ACTION_ICON: Record<string, typeof Upload> = {
  ASSET_UPLOADED: Upload,
  SCAN_RUN: Search,
  INCIDENT_DETECTED: Siren,
  DMCA_FILED: FileText,
  NUKE_TRIGGERED: Bomb,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const { stats, statsLoading, refreshStats } = useAppStatus();
  const { showToast } = useToast();
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadActivity = useCallback(() => {
    setActivityLoading(true);
    setActivityError(null);
    getActivity()
      .then((entries) => setActivity(entries.slice(0, 6)))
      .catch((err) =>
        setActivityError(err instanceof ApiError ? err.message : "Failed to load activity")
      )
      .finally(() => setActivityLoading(false));
  }, []);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const runScan = async () => {
    setScanning(true);
    try {
      const result = await postScan();
      const n = result.new_incidents.length;
      showToast(
        n > 0
          ? `Scan complete — ${n} new incident${n === 1 ? "" : "s"} detected.`
          : "Scan complete — no new incidents detected.",
        n > 0 ? "success" : "info"
      );
      await Promise.all([refreshStats(), loadActivity()]);
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Scan failed — try again.",
        "error"
      );
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">
              Your protected content, at a glance.
            </p>
          </div>
          <button
            onClick={runScan}
            disabled={scanning}
            className={`group relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-70 ${
              scanning ? "" : "animate-cta-glow"
            }`}
          >
            {scanning ? <Spinner size={18} /> : <Search className="h-[18px] w-[18px]" />}
            {scanning ? "Scanning for leaks…" : "Run Scan"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Assets" value={stats?.assets ?? 0} accent="violet" icon={<Image />} loading={statsLoading} />
          <StatCard label="Incidents" value={stats?.incidents ?? 0} accent="amber" icon={<Siren />} loading={statsLoading} />
          <StatCard label="Filed" value={stats?.filed ?? 0} accent="emerald" icon={<FileText />} loading={statsLoading} />
          <StatCard label="Resolved" value={stats?.resolved ?? 0} accent="red" icon={<CheckCircle2 />} loading={statsLoading} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          <Link to="/activity" className="text-sm font-medium text-violet-400 hover:text-violet-300">
            View all →
          </Link>
        </div>

        {activityError ? (
          <ErrorBanner message={activityError} onRetry={loadActivity} />
        ) : activityLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-14 rounded-lg" />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <EmptyState
            icon={<Radar />}
            title="No activity yet"
            subtitle="Upload an asset and run a scan to start building your audit trail."
            action={
              <Link
                to="/assets"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
              >
                Upload your first asset
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-slate-900/50">
            {activity.map((entry) => {
              const Icon = ACTION_ICON[entry.action];
              const iconEl = Icon ? (
                <Icon className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
              );
              return (
                <li key={entry.id}>
                  {entry.incident_id ? (
                    <Link
                      to={`/incidents/${entry.incident_id}`}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5"
                    >
                      {iconEl}
                      <span className="flex-1 truncate text-sm text-slate-200">{entry.details}</span>
                      <span className="shrink-0 text-xs text-slate-500">{timeAgo(entry.timestamp)}</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      {iconEl}
                      <span className="flex-1 truncate text-sm text-slate-200">{entry.details}</span>
                      <span className="shrink-0 text-xs text-slate-500">{timeAgo(entry.timestamp)}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
