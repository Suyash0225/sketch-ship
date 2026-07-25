import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  Search,
  Siren,
  FileText,
  Bomb,
  Image,
  CheckCircle2,
  Radar,
  Play,
} from "lucide-react";
import {
  postScan,
  getActivity,
  getIncidents,
  seedLeakUrl,
  ApiError,
  type ActivityLogEntry,
  type Incident,
} from "../lib/api";
import { useAppStatus } from "../context/AppStatusContext";
import { useToast } from "../context/ToastContext";
import StatCard from "../components/StatCard";
import StatusChip from "../components/StatusChip";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import { timeAgo, caseNo } from "../lib/format";

const ACTION_ICON: Record<string, typeof Upload> = {
  ASSET_UPLOADED: Upload,
  SCAN_RUN: Search,
  INCIDENT_DETECTED: Siren,
  DMCA_FILED: FileText,
  NUKE_TRIGGERED: Bomb,
};

/* Activity dot colour by kind — the ledger reads at a glance. */
const ACTION_DOT: Record<string, string> = {
  ASSET_UPLOADED: "text-ink-faint",
  SCAN_RUN: "text-azure",
  INCIDENT_DETECTED: "text-brass",
  DMCA_FILED: "text-iris",
  NUKE_TRIGGERED: "text-crimson",
};

export default function Dashboard() {
  const { stats, statsLoading, refreshStats } = useAppStatus();
  const { showToast } = useToast();
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
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

  const loadIncidents = useCallback(() => {
    setIncidentsLoading(true);
    getIncidents()
      .then((list) =>
        setIncidents(
          [...list]
            .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
            .slice(0, 3)
        )
      )
      // The detections panel is secondary — a failure here shouldn't take the
      // whole overview down, the stat row and ledger still render.
      .catch(() => setIncidents([]))
      .finally(() => setIncidentsLoading(false));
  }, []);

  useEffect(() => {
    loadActivity();
    loadIncidents();
  }, [loadActivity, loadIncidents]);

  const runScan = async () => {
    setScanning(true);
    try {
      const result = await postScan();
      const n = result.new_incidents.length;
      showToast(
        n > 0
          ? `Scan complete — ${n} new case${n === 1 ? "" : "s"} opened.`
          : "Scan complete — no new infringements found.",
        n > 0 ? "success" : "info"
      );
      await Promise.all([refreshStats(), loadActivity(), loadIncidents()]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Scan failed — try again.", "error");
    } finally {
      setScanning(false);
    }
  };

  const lastSweep = activity.find((a) => a.action === "SCAN_RUN");

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------- masthead */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-iris">
            Surveillance active
            {lastSweep ? ` · last sweep ${timeAgo(lastSweep.timestamp)}` : " · no sweep yet"}
          </p>
          <h1 className="display mt-2 text-[31px] text-ink">Your content, watched.</h1>
        </div>
        <button onClick={runScan} disabled={scanning} className="btn btn-primary">
          {scanning ? (
            <span className="gt-pulse inline-flex items-center gap-2">
              <Spinner size={14} /> SCANNING THE INDEX…
            </span>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" /> RUN SCAN
            </>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- stats */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label="Protected assets"
          value={stats?.assets ?? 0}
          accent="ink"
          sub="fingerprinted + hashed"
          icon={<Image />}
          loading={statsLoading}
        />
        {/* /dashboard/stats counts INCIDENTS, not notices — a nuke files 3–4
            takedowns against one incident. Captions say so. */}
        <StatCard
          label="Incidents detected"
          value={stats?.incidents ?? 0}
          accent="amber"
          sub="across all sweeps"
          icon={<Siren />}
          loading={statsLoading}
        />
        <StatCard
          label="Takedowns filed"
          value={stats?.filed ?? 0}
          accent="uv"
          sub="cases struck"
          icon={<FileText />}
          loading={statsLoading}
        />
        <StatCard
          label="Resolved"
          value={stats?.resolved ?? 0}
          accent="mint"
          sub="content removed"
          icon={<CheckCircle2 />}
          loading={statsLoading}
        />
      </div>

      {/* -------------------------------------------------- latest detections */}
      <div className="surface overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <p className="eyebrow">Latest detections</p>
          <Link
            to="/incidents"
            className="font-mono text-[11px] text-iris-soft transition hover:text-ink"
          >
            VIEW ALL →
          </Link>
        </div>

        {incidentsLoading ? (
          <div className="space-y-px p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-ink-faint">
            No detections yet — run a scan to sweep your assets against the index.
          </p>
        ) : (
          incidents.map((inc) => (
            <Link key={inc.id} to={`/incidents/${inc.id}`} className="gt-row">
              <span className="h-[34px] w-[46px] shrink-0 overflow-hidden rounded-md border border-line bg-well">
                <img
                  src={seedLeakUrl(inc.leak_image_path)}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold text-ink">
                  Case {caseNo(inc.id)}{" "}
                  <span className="font-normal text-ink-faint">on</span> {inc.platform}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-ink-faint">
                  {timeAgo(inc.detected_at)}
                </span>
              </span>
              <span
                className={`display shrink-0 text-[16px] tabular-nums ${
                  inc.similarity_score >= 90
                    ? "text-crimson"
                    : inc.similarity_score >= 75
                    ? "text-brass"
                    : "text-iris"
                }`}
              >
                {inc.similarity_score}
              </span>
              <StatusChip status={inc.status} />
            </Link>
          ))
        )}
      </div>

      {/* ---------------------------------------------------------- activity */}
      <div className="surface p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="eyebrow">Activity</p>
          <Link
            to="/activity"
            className="font-mono text-[11px] text-iris-soft transition hover:text-ink"
          >
            VIEW ALL →
          </Link>
        </div>

        {activityError ? (
          <ErrorBanner message={activityError} onRetry={loadActivity} />
        ) : activityLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-8" />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <EmptyState
            icon={<Radar />}
            title="Nothing on record yet"
            subtitle="Submit an exhibit and run a sweep to start building your audit trail."
            action={
              <Link to="/assets" className="btn btn-primary">
                Upload your first asset
              </Link>
            }
          />
        ) : (
          <ul>
            {activity.slice(0, 4).map((entry) => {
              const Icon = ACTION_ICON[entry.action];
              const dot = ACTION_DOT[entry.action] ?? "text-ink-faint";
              const row = (
                <>
                  <span className="w-[58px] shrink-0 font-mono text-[10px] tabular-nums text-ink-faint">
                    {timeAgo(entry.timestamp)}
                  </span>
                  <span className={`shrink-0 ${dot}`}>
                    {Icon ? <Icon className="h-3 w-3" /> : "●"}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink-soft">
                    {entry.details}
                  </span>
                </>
              );
              return (
                <li key={entry.id}>
                  {entry.incident_id ? (
                    <Link
                      to={`/incidents/${entry.incident_id}`}
                      className="-mx-2 flex items-baseline gap-3 rounded-md px-2 py-[7px] transition hover:bg-iris/5"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-baseline gap-3 px-0 py-[7px]">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
