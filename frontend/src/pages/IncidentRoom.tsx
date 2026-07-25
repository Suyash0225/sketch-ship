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
import GoogleVisionBadge from "../components/GoogleVisionBadge";
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

function ExhibitFrame({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "ink" | "crimson";
  children: React.ReactNode;
}) {
  return (
    <figure
      className={`border bg-card p-2 shadow-[3px_4px_0_0_rgba(33,29,20,0.1)] ${
        tone === "crimson" ? "border-crimson/50" : "border-line"
      }`}
    >
      <div className="aspect-video border border-line bg-well">{children}</div>
      <figcaption
        className={`mt-2 px-1 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
          tone === "crimson" ? "text-crimson" : "text-ink-soft"
        }`}
      >
        {label}
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
      <div className="flex items-center justify-center gap-2 py-24 text-xs uppercase tracking-[0.16em] text-ink-faint">
        <Spinner size={20} />
        Pulling the case file…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <Search className="mx-auto mb-2 h-10 w-10 text-ink-faint" />
        <p className="mb-1 font-display text-xl text-ink">Case not found</p>
        <p className="mb-5 text-xs text-ink-soft">
          It may have been resolved or the link is stale.
        </p>
        <Link
          to="/incidents"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-crimson hover:text-crimson-deep"
        >
          ← Back to cases
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
    <div className="space-y-10">
      <div>
        <Link
          to="/incidents"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint hover:text-ink"
        >
          ← All cases
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl tracking-tight text-ink">
            Case {caseNo(incident.id)}
          </h1>
          <PlatformBadge platform={incident.platform} />
          {incident.source === "GOOGLE_VISION" && <GoogleVisionBadge />}
          <StatusChip status={incident.status} />
        </div>
        <a
          href={incident.leak_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block truncate text-[11px] text-ink-faint hover:text-crimson hover:underline"
        >
          {incident.leak_url}
        </a>
      </div>

      {/* Exhibit A vs Exhibit B */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ExhibitFrame label="Exhibit A — Original work" tone="ink">
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
        <ExhibitFrame label={`Exhibit B — Infringing copy · ${incident.platform}`} tone="crimson">
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

      {/* Finding: score + expert reasoning */}
      <div className="flex flex-col items-center gap-4 border-y-2 border-ink py-8 text-center">
        <ScoreRing score={incident.similarity_score} size={140} strokeWidth={10} caption="match" />
        <p className="max-w-2xl font-display text-lg italic leading-relaxed text-ink">
          “{incident.reasoning}”
        </p>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-faint">
          — {incident.source === "GOOGLE_VISION" ? "Google Vision Web Detection" : "Gemini vision analysis"}
        </p>
      </div>

      {/* Steps taken + what's next */}
      <FilingTimeline incident={incident} takedowns={takedowns} platforms={platforms} />

      {/* DMCA notice tabs */}
      <div>
        <h2 className="mb-3 border-b border-ink pb-2 font-display text-2xl text-ink">
          The Notice
        </h2>
        <div className="mb-4 flex flex-wrap gap-5 text-[11px] font-semibold uppercase tracking-[0.16em]">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => selectTab(p)}
              className={`cursor-pointer border-b-2 pb-1 transition ${
                activeTab === p
                  ? "border-crimson text-ink"
                  : "border-transparent text-ink-faint hover:border-line hover:text-ink"
              }`}
            >
              {p}
              {takedowns[p] && <span className="ml-1.5 text-verdant">✓</span>}
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

      {/* File everywhere */}
      <div className="space-y-5 border-3 border-double border-crimson/60 bg-crimson-wash/40 p-6">
        <div className="text-center">
          <h2 className="font-display text-2xl text-crimson-deep">
            Ready to take this down everywhere?
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-ink-soft">
            One strike drafts and files a DMCA takedown notice on {platforms.join(", ")}{" "}
            simultaneously — every filing entered into the record below.
          </p>
        </div>
        <div className="relative">
          {justNuked && (
            <>
              <span className="pointer-events-none absolute inset-0 border-2 border-verdant/70 animate-success-ring" />
              <span
                className="pointer-events-none absolute inset-0 border-2 border-verdant/70 animate-success-ring"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="pointer-events-none absolute inset-0 border-2 border-verdant/70 animate-success-ring"
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
        <div className={`grid gap-3 ${platforms.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
          {platforms.map((p, idx) => (
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
