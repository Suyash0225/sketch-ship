import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { UploadCloud, Image as ImageIcon, Search } from "lucide-react";
import { getAssets, postAsset, postWebScan, uploadUrl, ApiError, type Asset } from "../lib/api";
import { useAppStatus } from "../context/AppStatusContext";
import { useToast } from "../context/ToastContext";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import { formatDate } from "../lib/format";

interface PendingUpload {
  tempId: string;
  fileName: string;
  previewUrl: string;
}

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [webScanningId, setWebScanningId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshStats } = useAppStatus();
  const { showToast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getAssets()
      .then(setAssets)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load assets"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast(`"${file.name}" isn't an image — skipped.`, "error");
      return;
    }
    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const previewUrl = URL.createObjectURL(file);
    setPending((p) => [...p, { tempId, fileName: file.name, previewUrl }]);

    try {
      const asset = await postAsset(file);
      setAssets((prev) => [asset, ...prev]);
      showToast(
        `Exhibit entered — Gemini fingerprinted "${asset.fingerprint?.subject ?? asset.filename}".`,
        "success"
      );
      refreshStats();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : `Failed to upload "${file.name}".`,
        "error"
      );
    } finally {
      setPending((p) => p.filter((x) => x.tempId !== tempId));
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const runWebScan = async (asset: Asset) => {
    setWebScanningId(asset.id);
    try {
      const result = await postWebScan(asset.id);
      if (result.new_incidents.length > 0) {
        showToast(
          `Real web search found ${result.new_incidents.length} match(es) for "${asset.filename}".`,
          "success"
        );
      } else if (result.raw_match_count > 0) {
        showToast(`Google found ${result.raw_match_count} candidate(s) but none were downloadable.`, "error");
      } else {
        showToast(`No real web matches found for "${asset.filename}" yet.`, "success");
      }
      refreshStats();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : `Web scan failed for "${asset.filename}".`,
        "error"
      );
    } finally {
      setWebScanningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
          Original works under protection
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight text-ink">Exhibits</h1>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ink-soft">
          Every submission is catalogued with a SHA-256 fingerprint and a Gemini-generated
          visual description used to detect leaks.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center border-2 border-dashed px-6 py-10 text-center transition ${
          dragActive
            ? "border-crimson bg-crimson-wash/50"
            : "border-line bg-card/60 hover:border-ink-faint hover:bg-card"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <UploadCloud className="mb-2 h-8 w-8 stroke-[1.5] text-ink-faint" />
        <p className="text-sm font-medium text-ink">
          Submit evidence — drag &amp; drop images, or click to browse
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          These become the originals GhostTrace protects and sweeps for
        </p>
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={load} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton aspect-square" />
          ))}
        </div>
      ) : assets.length === 0 && pending.length === 0 ? (
        <EmptyState
          icon={<ImageIcon />}
          title="No exhibits on file"
          subtitle="Submit your first piece of content above to start protecting it."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {pending.map((p) => (
            <div
              key={p.tempId}
              className="relative aspect-square overflow-hidden border border-line bg-card"
            >
              <img src={p.previewUrl} alt={p.fileName} className="h-full w-full object-cover opacity-30" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/70 text-center">
                <Spinner size={20} className="text-ink" />
                <p className="px-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft">
                  Fingerprinting with Gemini…
                </p>
              </div>
            </div>
          ))}
          {assets.map((asset, i) => (
            <div
              key={asset.id}
              className="animate-fade-in group border border-line bg-card p-2 transition hover:shadow-[3px_3px_0_0_rgba(33,29,20,0.12)]"
            >
              <div className="relative aspect-square overflow-hidden border border-line bg-well">
                <img
                  src={uploadUrl(asset.path || asset.filename)}
                  alt={asset.fingerprint?.subject ?? asset.filename}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="absolute left-1.5 top-1.5 bg-ink/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-paper">
                  Ex. {String(assets.length - i).padStart(2, "0")}
                </span>
              </div>
              <div className="px-1 pb-1 pt-3">
                <p className="truncate text-xs font-semibold text-ink">
                  {asset.fingerprint?.subject ?? asset.filename}
                </p>
                <p className="mt-1 truncate text-[11px] tabular-nums text-ink-faint">
                  {truncateHash(asset.sha256)}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-faint">{formatDate(asset.uploaded_at)}</p>
                {asset.fingerprint && asset.fingerprint.dominant_colors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {asset.fingerprint.dominant_colors.slice(0, 4).map((c) => (
                      <span
                        key={c}
                        className="border border-line bg-paper px-1.5 py-0.5 text-[10px] text-ink-soft"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => runWebScan(asset)}
                  disabled={webScanningId === asset.id}
                  className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 border border-ink px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink transition hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {webScanningId === asset.id ? (
                    <>
                      <Spinner size={12} />
                      Searching Google…
                    </>
                  ) : (
                    <>
                      <Search className="h-3 w-3" />
                      Real web scan
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
