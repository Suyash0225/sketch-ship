import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { UploadCloud, Image as ImageIcon } from "lucide-react";
import { getAssets, postAsset, uploadUrl, ApiError, type Asset } from "../lib/api";
import { useAppStatus } from "../context/AppStatusContext";
import { useToast } from "../context/ToastContext";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";

interface PendingUpload {
  tempId: string;
  fileName: string;
  previewUrl: string;
}

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragActive, setDragActive] = useState(false);
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
        `Asset uploaded — Gemini fingerprinted "${asset.fingerprint?.subject ?? asset.filename}".`,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Protected Assets</h1>
        <p className="mt-1 text-sm text-slate-400">
          Every upload gets a SHA-256 fingerprint and a Gemini-generated visual
          description used to detect leaks.
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
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragActive
            ? "border-violet-400 bg-violet-500/10"
            : "border-white/15 bg-slate-900/40 hover:border-violet-500/50 hover:bg-slate-900/60"
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
        <UploadCloud className="mb-2 h-8 w-8 text-slate-400" />
        <p className="font-medium text-slate-200">
          Drag &amp; drop images here, or click to browse
        </p>
        <p className="mt-1 text-xs text-slate-500">
          These become the originals GhostTrace protects and scans for.
        </p>
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={load} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton aspect-square rounded-xl" />
          ))}
        </div>
      ) : assets.length === 0 && pending.length === 0 ? (
        <EmptyState
          icon={<ImageIcon />}
          title="No assets yet"
          subtitle="Upload your first piece of content above to start protecting it."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {pending.map((p) => (
            <div
              key={p.tempId}
              className="relative aspect-square overflow-hidden rounded-xl border border-violet-500/40 bg-slate-900"
            >
              <img src={p.previewUrl} alt={p.fileName} className="h-full w-full object-cover opacity-40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/60 text-center">
                <Spinner size={22} className="text-violet-400" />
                <p className="px-2 text-xs font-medium text-violet-200">
                  Fingerprinting with Gemini…
                </p>
              </div>
            </div>
          ))}
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="animate-fade-in group overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 transition hover:border-violet-500/40"
            >
              <div className="aspect-square overflow-hidden bg-slate-950">
                <img
                  src={uploadUrl(asset.path || asset.filename)}
                  alt={asset.fingerprint?.subject ?? asset.filename}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-slate-200">
                  {asset.fingerprint?.subject ?? asset.filename}
                </p>
                <p className="mt-1 truncate font-mono text-xs text-slate-500">
                  {truncateHash(asset.sha256)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{formatDate(asset.uploaded_at)}</p>
                {asset.fingerprint && asset.fingerprint.dominant_colors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {asset.fingerprint.dominant_colors.slice(0, 4).map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
