import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, CheckCircle2 } from "lucide-react";
import {
  getIncident,
  getAssets,
  getTakedowns,
  postDmcaPreview,
  postNuke,
  uploadUrl,
  seedLeakUrl,
  ApiError,
  type Incident,
  type Asset,
  type Platform,
  type Takedown,
} from "../lib/api";
import { useAppStatus } from "../context/AppStatusContext";
import { useToast } from "../context/ToastContext";
import PlatformBadge from "../components/PlatformBadge";
import StatusChip from "../components/StatusChip";
import DmcaPreview from "../components/DmcaPreview";
import NukeButton from "../components/NukeButton";
import PlatformFlipCard from "../components/PlatformFlipCard";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import ScoreRing from "../components/ScoreRing";
import FilingTimeline from "../components/FilingTimeline";

const PLATFORMS: Platform[] = ["YouTube", "X", "Instagram"];

type PreviewState = {
  status: "idle" | "loading" | "preview" | "error";
  text?: string;
  error?: string;
};

export default function IncidentRoom() {
  const { id } = useParams<{ id: string }>();
  const { refreshStats } = useAppStatus();
  const { showToast } = useToast();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [originalAsset, setOriginalAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [activeTab, setActiveTab] = useState<Platform>(PLATFORMS[0]);
  const [previews, setPreviews] = useState<Record<Platform, PreviewState>>({
    YouTube: { status: "idle" },
    X: { status: "idle" },
    Instagram: { status: "idle" },
  });

  const [takedowns, setTakedowns] = useState<Partial<Record<Platform, Takedown>>>({});
  const [nuking, setNuking] = useState(false);
  const [justNuked, setJustNuked] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    Promise.all([getIncident(id), getAssets(), getTakedowns(id)])
      .then(([inc, assets, existingTakedowns]) => {
        setIncident(inc);
        setOriginalAsset(assets.find((a) => a.id === inc.asset_id) ?? null);
        if (existingTakedowns.length > 0) {
          const byPlatform: Partial<Record<Platform, Takedown>> = {};
          existingTakedowns.forEach((t) => {
            byPlatform[t.platform as Platform] = t;
          });
          setTakedowns(byPlatform);
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof ApiError ? err.message : "Failed to load incident");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const generatePreview = useCallback(
    async (platform: Platform) => {
      if (!id) return;
      setPreviews((p) => ({ ...p, [platform]: { status: "loading" } }));
      try {
        const res = await postDmcaPreview(id, platform);
        setPreviews((p) => ({ ...p, [platform]: { status: "preview", text: res.notice_text } }));
      } catch (err) {
        setPreviews((p) => ({
          ...p,
          [platform]: {
            status: "error",
            error: err instanceof ApiError ? err.message : "Failed to generate preview.",
          },
        }));
      }
    },
    [id]
  );

  const selectTab = (platform: Platform) => {
    setActiveTab(platform);
    if (previews[platform].status === "idle" && !takedowns[platform]) {
      generatePreview(platform);
    }
  };

  const nuke = async () => {
    if (!id) return;
    setNuking(true);
    try {
      const res = await postNuke(id);
      const byPlatform: Partial<Record<Platform, Takedown>> = {};
      res.takedowns.forEach((t) => {
        byPlatform[t.platform as Platform] = t;
      });
      setTakedowns(byPlatform);
      setJustNuked(true);
      showToast(`Takedown filed on ${res.takedowns.length} platforms.`, "success");
      setIncident((inc) => (inc ? { ...inc, status: "FILED" } : inc));
      refreshStats();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Nuke failed — try again.",
        "error"
      );
    } finally {
      setNuking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
        <Spinner size={22} />
        Loading incident…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <Search className="mx-auto mb-2 h-10 w-10 text-slate-600" />
        <p className="mb-1 font-semibold text-slate-200">Incident not found</p>
        <p className="mb-5 text-sm text-slate-400">
          It may have been resolved or the link is stale.
        </p>
        <Link to="/incidents" className="text-sm font-medium text-violet-400 hover:text-violet-300">
          ← Back to incidents
        </Link>
      </div>
    );
  }

  if (error || !incident) {
    return <ErrorBanner message={error ?? "Something went wrong."} onRetry={load} />;
  }

  const activePreview = previews[activeTab];
  const activeTakedown = takedowns[activeTab];

  return (
    <div className="space-y-8">
      <div>
        <Link to="/incidents" className="text-sm font-medium text-slate-400 hover:text-slate-200">
          ← Back to incidents
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Incident Room</h1>
          <PlatformBadge platform={incident.platform} />
          <StatusChip status={incident.status} />
        </div>
        <a
          href={incident.leak_url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block truncate text-xs text-slate-500 hover:text-violet-400 hover:underline"
        >
          {incident.leak_url}
        </a>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/50">
          <p className="border-b border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Original
          </p>
          <div className="aspect-video bg-slate-950">
            {originalAsset ? (
              <img
                src={uploadUrl(originalAsset.path || originalAsset.filename)}
                alt="Original asset"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-600">
                Original asset unavailable
              </div>
            )}
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-red-500/20 bg-slate-900/50">
          <p className="border-b border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-300">
            Leaked copy — {incident.platform}
          </p>
          <div className="aspect-video bg-slate-950">
            <img
              src={seedLeakUrl(incident.leak_image_path)}
              alt="Leaked copy"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Score + reasoning */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/10 to-transparent p-6 text-center">
        <ScoreRing score={incident.similarity_score} size={140} strokeWidth={10} caption="match" />
        <p className="max-w-2xl text-sm text-slate-300">“{incident.reasoning}”</p>
        <p className="text-xs text-slate-500">— Gemini vision analysis</p>
      </div>

      {/* DMCA preview tabs */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-white">DMCA Notice Preview</h2>
        <div className="mb-3 flex gap-1 rounded-full border border-white/10 bg-white/5 p-1 w-fit">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => selectTab(p)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeTab === p
                  ? "bg-violet-500/90 text-white shadow"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {p}
              {takedowns[p] && <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-emerald-300" />}
            </button>
          ))}
        </div>

        <DmcaPreview
          platform={activeTab}
          status={activeTakedown ? "filed" : activePreview.status}
          noticeText={activeTakedown?.notice_text ?? activePreview.text}
          filedAt={activeTakedown?.filed_at}
          errorMessage={activePreview.error}
          onGenerate={() => generatePreview(activeTab)}
        />
      </div>

      {/* Nuke */}
      <div className="space-y-4 rounded-2xl border border-red-500/20 bg-red-950/10 p-6">
        <div className="text-center">
          <h2 className="text-lg font-bold text-red-200">Ready to take this down everywhere?</h2>
          <p className="mt-1 text-sm text-slate-400">
            One click drafts and files a DMCA takedown notice on YouTube, X, and Telegram simultaneously.
          </p>
        </div>
        <div className="relative">
          {justNuked && (
            <>
              <span className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-emerald-400/70 animate-success-ring" />
              <span
                className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-emerald-400/70 animate-success-ring"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-emerald-400/70 animate-success-ring"
                style={{ animationDelay: "300ms" }}
              />
            </>
          )}
          <NukeButton
            onClick={nuke}
            nuking={nuking}
            alreadyFiled={incident.status === "FILED"}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {PLATFORMS.map((p, idx) => (
            <PlatformFlipCard
              key={p}
              platform={p}
              filed={!!takedowns[p] || incident.status === "FILED"}
              justFiled={justNuked}
              filedAt={takedowns[p]?.filed_at}
              delayMs={idx * 120}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
