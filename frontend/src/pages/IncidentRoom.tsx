import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search } from "lucide-react";
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
import SourceBadge from "../components/SourceBadge";
import StatusChip from "../components/StatusChip";
import DmcaPreview from "../components/DmcaPreview";
import NukeButton from "../components/NukeButton";
import PlatformFlipCard from "../components/PlatformFlipCard";
import Spinner from "../components/Spinner";
import ErrorBanner from "../components/ErrorBanner";
import ScoreRing from "../components/ScoreRing";
import FilingTimeline from "../components/FilingTimeline";
import { caseNo } from "../lib/format";

const BASE_PLATFORMS: Platform[] = ["YouTube", "X", "Instagram"];

type PreviewState = {
  status: "idle" | "loading" | "preview" | "error";
  text?: string;
  error?: string;
};

/**
 * One side of the side-by-side compare. The suspect frame carries a coral
 * wash plus a travelling scanline so the two panes are never confusable at a
 * glance — which matters when the next click files a legal notice.
 */
function ExhibitFrame({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "ink" | "crimson";
  children: React.ReactNode;
}) {
  const suspect = tone === "crimson";
  return (
    <figure className="min-w-[180px] flex-1">
      <div className="relative aspect-video overflow-hidden rounded-[10px] border border-line bg-well">
        {children}
        {suspect && (
          <>
            <span className="gt-scanline" />
            <span className="pointer-events-none absolute inset-0 rounded-[10px] border border-crimson/50 bg-crimson/10" />
          </>
        )}
      </div>
      <figcaption
        className={`mt-2 flex items-center gap-1.5 font-mono text-[10px] ${
          suspect ? "text-crimson" : "text-verdant"
        }`}
      >
        <span aria-hidden>{suspect ? "⚠" : "◉"}</span>
        <span className="truncate">{label}</span>
      </figcaption>
    </figure>
  );
}

export default function IncidentRoom() {
  const { id } = useParams<{ id: string }>();
  const { refreshStats } = useAppStatus();
  const { showToast } = useToast();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [originalAsset, setOriginalAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [activeTab, setActiveTab] = useState<string>(BASE_PLATFORMS[0]);
  const [previews, setPreviews] = useState<Record<string, PreviewState>>({
    YouTube: { status: "idle" },
    X: { status: "idle" },
    Instagram: { status: "idle" },
  });

  const [takedowns, setTakedowns] = useState<Partial<Record<string, Takedown>>>({});
  const [nuking, setNuking] = useState(false);
  const [justNuked, setJustNuked] = useState(false);

  // The leak may have been found on a real platform (via SerpApi) outside
  // the three we have dedicated DMCA templates for -- surface that platform
  // as its own tab too so a notice can be drafted/filed for it.
  const platforms = incident
    ? Array.from(new Set<string>([incident.platform, ...BASE_PLATFORMS]))
    : BASE_PLATFORMS;

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    Promise.all([getIncident(id), getAssets(), getTakedowns(id)])
      .then(([inc, assets, existingTakedowns]) => {
        setIncident(inc);
        setOriginalAsset(assets.find((a) => a.id === inc.asset_id) ?? null);
        setActiveTab(inc.platform);
        setPreviews((p) => (p[inc.platform] ? p : { ...p, [inc.platform]: { status: "idle" } }));
        if (existingTakedowns.length > 0) {
          const byPlatform: Partial<Record<string, Takedown>> = {};
          existingTakedowns.forEach((t) => {
            byPlatform[t.platform] = t;
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
    async (platform: string) => {
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

  const selectTab = (platform: string) => {
    setActiveTab(platform);
    if ((previews[platform]?.status ?? "idle") === "idle" && !takedowns[platform]) {
      generatePreview(platform);
    }
  };

  const nuke = async () => {
    if (!id) return;
    setNuking(true);
    try {
      const res = await postNuke(id);
      const byPlatform: Partial<Record<string, Takedown>> = {};
      res.takedowns.forEach((t) => {
        byPlatform[t.platform] = t;
      });
      setTakedowns(byPlatform);
      setJustNuked(true);
      showToast(`Takedown filed on ${res.takedowns.length} platforms.`, "success");
      setIncident((inc) => (inc ? { ...inc, status: "FILED" } : inc));
      refreshStats();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Filing failed — try again.",
        "error"
      );
    } finally {
      setNuking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-24 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
        <Spinner size={18} />
        Pulling the case file…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <Search className="mx-auto mb-2 h-10 w-10 text-ink-faint" />
        <p className="mb-1 text-[17px] font-semibold text-ink">Case not found</p>
        <p className="mb-5 text-xs text-ink-soft">
          It may have been resolved or the link is stale.
        </p>
        <Link
          to="/incidents"
          className="font-mono text-[11px] text-iris-soft hover:text-ink"
        >
          ← ALL INCIDENTS
        </Link>
      </div>
    );
  }

  if (error || !incident) {
    return <ErrorBanner message={error ?? "Something went wrong."} onRetry={load} />;
  }

  const activePreview = previews[activeTab] ?? { status: "idle" as const };
  const activeTakedown = takedowns[activeTab];

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/incidents"
          className="font-mono text-[11px] text-ink-faint transition hover:text-ink"
        >
          ← ALL INCIDENTS
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-[12px] text-iris-soft">
            CASE {caseNo(incident.id)}
          </span>
          <SourceBadge source={incident.source} />
          <StatusChip status={incident.status} />
        </div>
        <h1 className="display mt-1.5 text-[25px] text-ink">
          {originalAsset?.fingerprint?.subject ?? originalAsset?.filename ?? "Your work"}{" "}
          <span className="font-normal text-ink-faint">found on</span> {incident.platform}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PlatformBadge platform={incident.platform} size="sm" />
          <a
            href={incident.leak_url}
            target="_blank"
            rel="noreferrer"
            className="truncate font-mono text-[11px] text-ink-faint transition hover:text-iris-soft"
          >
            {incident.leak_url}
          </a>
        </div>
      </div>

      {/* ---------------------------------------------- evidence, side by side */}
      <div className="surface p-[18px]">
        <p className="eyebrow">Evidence — side by side</p>
        <div className="mt-3 flex flex-wrap items-stretch gap-3.5">
          <ExhibitFrame label="YOUR ORIGINAL" tone="ink">
            {originalAsset ? (
              <img
                src={uploadUrl(originalAsset.path || originalAsset.filename)}
                alt="Original asset"
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-ink-faint">
                Original asset unavailable
              </div>
            )}
          </ExhibitFrame>

          <div className="flex min-w-[92px] items-center justify-center">
            <ScoreRing score={incident.similarity_score} size={92} strokeWidth={5} caption="match" />
          </div>

          <ExhibitFrame label={`SUSPECT COPY — ${incident.platform}`} tone="crimson">
            <img
              src={seedLeakUrl(incident.leak_image_path)}
              alt="Leaked copy"
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </ExhibitFrame>
        </div>

        <div className="mt-4 rounded-[10px] border border-line bg-iris/5 px-3.5 py-3">
          <p className="eyebrow text-iris">
            {incident.source === "SYNTHETIC"
              ? "Gemini vision — why this is a match"
              : "Google reverse-image search — why this is a match"}
          </p>
          <p className="mt-2 font-mono text-[11.5px] leading-[1.75] text-ink-soft">
            {incident.reasoning}
          </p>
        </div>
      </div>

      {/* Steps taken + what's next */}
      <FilingTimeline incident={incident} takedowns={takedowns} platforms={platforms} />

      {/* ------------------------------------------------------- strike panel */}
      <div className="surface p-5">
        <p className="eyebrow">Strike panel</p>

        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div className="relative">
            {justNuked && (
              <>
                <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-verdant/70 animate-success-ring" />
                <span
                  className="pointer-events-none absolute inset-0 rounded-full border-2 border-verdant/70 animate-success-ring"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="pointer-events-none absolute inset-0 rounded-full border-2 border-verdant/70 animate-success-ring"
                  style={{ animationDelay: "300ms" }}
                />
              </>
            )}
            <NukeButton
              onClick={nuke}
              nuking={nuking}
              alreadyFiled={incident.status === "FILED"}
              platformCount={platforms.length}
            />
          </div>

          <div className="min-w-[260px] flex-1">
            <div className="flex flex-wrap gap-2.5">
              {platforms.map((p, idx) => (
                <PlatformFlipCard
                  key={p}
                  platform={p}
                  filed={!!takedowns[p] || incident.status === "FILED"}
                  justFiled={justNuked}
                  filedAt={takedowns[p]?.filed_at}
                  delayMs={200 + idx * 260}
                />
              ))}
            </div>
            <p className="mt-3 font-mono text-[10px] leading-[1.7] text-ink-faint">
              One hold. {platforms.length} notices. Notice text is generated per-platform,
              timestamped, and appended to the audit log — export it from Activity as your
              evidence file.
            </p>
          </div>
        </div>

        {/* ----------------------------------------------- dmca preview tabs */}
        <div className="mt-6">
          <div className="flex flex-wrap gap-1.5 border-b border-line">
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => selectTab(p)}
                className={`cursor-pointer border-b-2 px-3.5 py-2 font-mono text-[11px] tracking-[0.08em] transition ${
                  activeTab === p
                    ? "border-b-iris text-iris-soft"
                    : "border-b-transparent text-ink-faint hover:text-ink"
                }`}
              >
                {p.toUpperCase()}
                {takedowns[p] && <span className="ml-1.5 text-verdant">✓</span>}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <DmcaPreview
              platform={activeTab}
              status={activeTakedown ? "filed" : activePreview.status}
              noticeText={activeTakedown?.notice_text ?? activePreview.text}
              filedAt={activeTakedown?.filed_at}
              errorMessage={activePreview.error}
              onGenerate={() => generatePreview(activeTab)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
