import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Image as ImageIcon, Search, X, ArrowDownWideNarrow } from "lucide-react";
import {
  getAssetsPage,
  postAssetWithProgress,
  postWebScan,
  uploadUrl,
  ApiError,
  type Asset,
  type AssetQuery,
} from "../lib/api";
import { prepareImage, runPool, formatBytes, MAX_UPLOAD_BYTES } from "../lib/upload";
import { useAppStatus } from "../context/AppStatusContext";
import { useToast } from "../context/ToastContext";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import UploadDropzone from "../components/UploadDropzone";
import UploadQueue, { type UploadItem } from "../components/UploadQueue";
import { formatDate } from "../lib/format";

/** Rows fetched per page. Small enough that a slow key feels instant. */
const PAGE_SIZE = 24;
/** Simultaneous uploads. Above ~4 the browser queues them anyway. */
const UPLOAD_CONCURRENCY = 3;
const SEARCH_DEBOUNCE_MS = 300;

type SortKey = NonNullable<AssetQuery["sort"]>;

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "name", label: "A–Z" },
];

function truncateHash(hash: string): string {
  return hash.length <= 16 ? hash : `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The navbar's search box hands its term over as ?q= rather than keeping a
  // second index of its own — this page stays the single source of truth.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [rawQuery, setRawQuery] = useState(urlQuery);
  const [query, setQuery] = useState(urlQuery);
  const [sort, setSort] = useState<SortKey>("newest");

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [webScanningId, setWebScanningId] = useState<string | null>(null);

  const { refreshStats } = useAppStatus();
  const { showToast } = useToast();

  // Retry needs the original File back, and File isn't serialisable into
  // component state cleanly — keep them beside the queue, keyed by item id.
  const filesRef = useRef(new Map<string, File>());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ---------------------------------------------------------------- loading

  const loadPage = useCallback(
    async (offset: number) => {
      const isFirst = offset === 0;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const page = await getAssetsPage({ limit: PAGE_SIZE, offset, q: query, sort });
        setTotal(page.total);
        setAssets((prev) => {
          if (isFirst) return page.items;
          // Guard against a double-fire of the scroll sentinel duplicating rows.
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...page.items.filter((a) => !seen.has(a.id))];
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load exhibits");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, sort]
  );

  // Adopt a term arriving from the navbar. Guarded on urlQuery only, so a
  // later edit in this page's own box isn't stomped back to the URL value.
  useEffect(() => {
    setRawQuery(urlQuery);
  }, [urlQuery]);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setQuery(rawQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [rawQuery]);

  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  // Infinite scroll: fetch the next page when the sentinel scrolls into view.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || loadingMore || assets.length >= total) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadPage(assets.length);
      },
      { rootMargin: "300px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [assets.length, total, loading, loadingMore, loadPage]);

  useEffect(() => {
    const files = filesRef.current;
    return () => {
      files.clear();
    };
  }, []);

  // ---------------------------------------------------------------- uploads

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...changes } : u)));
  }, []);

  const processOne = useCallback(
    async (item: UploadItem) => {
      const file = filesRef.current.get(item.id);
      if (!file) return;

      try {
        patch(item.id, { stage: "preparing", progress: 0, error: undefined });
        const prepared = await prepareImage(file);
        patch(item.id, {
          stage: "uploading",
          sentBytes: prepared.file.size,
          compressed: prepared.compressed,
        });

        const asset = await postAssetWithProgress(prepared.file, {
          onProgress: (fraction) => {
            // The server still has to run Gemini after the last byte lands —
            // flip to an indeterminate stage rather than sitting at 100%.
            if (fraction >= 1) patch(item.id, { stage: "analyzing", progress: 1 });
            else patch(item.id, { progress: fraction });
          },
        });

        patch(item.id, {
          stage: "done",
          progress: 1,
          subject: asset.fingerprint?.subject ?? asset.filename,
        });
        filesRef.current.delete(item.id);

        // Prepend so the new exhibit is visible without a refetch, and keep
        // the "Showing X of Y" counter honest.
        setAssets((prev) => (prev.some((a) => a.id === asset.id) ? prev : [asset, ...prev]));
        setTotal((t) => t + 1);
        refreshStats();
      } catch (err) {
        patch(item.id, {
          stage: "error",
          error: err instanceof ApiError ? err.message : "Upload failed",
        });
      }
    },
    [patch, refreshStats]
  );

  const enqueue = useCallback(
    (files: File[]) => {
      const accepted: UploadItem[] = [];
      let rejected = 0;

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          rejected++;
          continue;
        }
        const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
        filesRef.current.set(id, file);
        accepted.push({
          id,
          fileName: file.name,
          previewUrl: URL.createObjectURL(file),
          originalBytes: file.size,
          compressed: false,
          stage: "queued",
          progress: 0,
          error:
            file.size > MAX_UPLOAD_BYTES
              ? `Too large (${formatBytes(file.size)}) — will be downscaled`
              : undefined,
        });
      }

      if (rejected > 0) {
        showToast(
          `${rejected} non-image file${rejected === 1 ? "" : "s"} skipped.`,
          "error"
        );
      }
      if (accepted.length === 0) return;

      setUploads((prev) => [...prev, ...accepted]);
      runPool(accepted, UPLOAD_CONCURRENCY, processOne).then(() => {
        showToast(`Intake complete — ${accepted.length} exhibit(s) processed.`, "success");
      });
    },
    [processOne, showToast]
  );

  const retry = useCallback(
    (id: string) => {
      const item = uploads.find((u) => u.id === id);
      if (item) processOne(item);
    },
    [uploads, processOne]
  );

  const dismiss = useCallback((id: string) => {
    setUploads((prev) => {
      const target = prev.find((u) => u.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((u) => u.id !== id);
    });
    filesRef.current.delete(id);
  }, []);

  const clearFinished = useCallback(() => {
    setUploads((prev) => {
      prev
        .filter((u) => u.stage === "done" || u.stage === "cancelled")
        .forEach((u) => URL.revokeObjectURL(u.previewUrl));
      return prev.filter((u) => u.stage !== "done" && u.stage !== "cancelled");
    });
  }, []);

  const uploadsActive = useMemo(
    () => uploads.some((u) => u.stage !== "done" && u.stage !== "error" && u.stage !== "cancelled"),
    [uploads]
  );

  // ------------------------------------------------------------- web scan

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
        showToast(
          `Google found ${result.raw_match_count} candidate(s) but none were downloadable.`,
          "error"
        );
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

  // ----------------------------------------------------------------- render

  const hasMore = assets.length < total;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-iris">Evidence locker</p>
        <h1 className="display mt-2 text-[27px] text-ink">Protected assets</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
          Every upload is catalogued with a SHA-256 fingerprint and a Gemini-generated
          visual description. Oversized images are downscaled in your browser first.
        </p>
      </div>

      <UploadDropzone onFiles={enqueue} busy={uploadsActive} />

      <UploadQueue
        items={uploads}
        onRetry={retry}
        onDismiss={dismiss}
        onClearFinished={clearFinished}
      />

      {/* Toolbar — search + sort + live count */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <input
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Search filename, hash, or AI description…"
            className="input pl-9 pr-9"
          />
          {rawQuery && (
            <button
              type="button"
              onClick={() => {
                setRawQuery("");
                if (urlQuery) setSearchParams({}, { replace: true });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-ink-faint transition hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-0.5 rounded-[10px] border border-line bg-well/60 p-1">
          <ArrowDownWideNarrow className="mx-1 h-3.5 w-3.5 text-ink-faint" />
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                sort === s.key
                  ? "bg-raised text-ink shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                  : "text-ink-faint hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <p className="text-[12px] tabular-nums text-ink-faint">
          {loading ? "…" : `${assets.length} of ${total}`}
        </p>
      </div>

      {error ? (
        <ErrorBanner message={error} onRetry={() => loadPage(0)} />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton aspect-square" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={<ImageIcon />}
          title={query ? "No exhibits match that search" : "No exhibits on file"}
          subtitle={
            query
              ? "Try a different filename, hash fragment, or description keyword."
              : "Submit your first piece of content above to start protecting it."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {assets.map((asset, i) => (
              <div
                key={asset.id}
                className="animate-intake surface surface-hover group p-2"
                // Stagger only within a page — a 300-item list shouldn't
                // wait 30s for the last card to appear.
                style={{ animationDelay: `${(i % PAGE_SIZE) * 18}ms` }}
              >
                <div className="relative aspect-square overflow-hidden rounded-[10px] border border-line bg-well">
                  <img
                    src={uploadUrl(asset.path || asset.filename)}
                    alt={asset.fingerprint?.subject ?? asset.filename}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/55 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white backdrop-blur-sm">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {/* UV band sweeps the tile while Google Lens is being queried. */}
                  {webScanningId === asset.id && <span className="gt-scanline" />}
                </div>
                <div className="px-1.5 pb-1 pt-3">
                  <p className="truncate text-[14px] font-bold text-ink">
                    {asset.fingerprint?.subject ?? asset.filename}
                  </p>
                  <p className="mt-1 truncate font-mono text-[9.5px] tabular-nums text-ink-faint">
                    sha256 {truncateHash(asset.sha256)}
                  </p>
                  <p className="mt-0.5 font-mono text-[9.5px] text-ink-faint">
                    {formatDate(asset.uploaded_at)}
                  </p>
                  {asset.fingerprint && asset.fingerprint.dominant_colors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {asset.fingerprint.dominant_colors.slice(0, 4).map((c) => (
                        <span
                          key={c}
                          className="rounded-md border border-line bg-well px-1.5 py-0.5 text-[10px] text-ink-soft"
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
                    className="btn btn-secondary mt-3 w-full px-2 py-1.5 font-mono text-[11px] tracking-[0.08em]"
                  >
                    {webScanningId === asset.id ? (
                      <span className="gt-pulse inline-flex items-center gap-1.5">
                        <Spinner size={11} />
                        ASKING GOOGLE…
                      </span>
                    ) : (
                      <>
                        <Search className="h-3 w-3" />
                        SCAN THE WEB
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div ref={sentinelRef} className="py-4 text-center">
            {loadingMore ? (
              <span className="inline-flex items-center gap-2 text-[13px] text-ink-faint">
                <Spinner size={14} />
                Loading more…
              </span>
            ) : hasMore ? (
              <button
                type="button"
                onClick={() => loadPage(assets.length)}
                className="btn btn-secondary"
              >
                Load {Math.min(PAGE_SIZE, total - assets.length)} more
              </button>
            ) : (
              <span className="text-[13px] text-ink-faint">
                All {total} asset{total === 1 ? "" : "s"} loaded
              </span>
            )}
          </div>
        </>
      )}

      {/* Honesty note. GhostTrace never crawls — say so rather than implying
          coverage we don't have (CLAUDE.md §4, "no real crawling"). */}
      <div className="rounded-[10px] border border-dashed border-iris-dim px-4 py-3 font-mono text-[11px] leading-[1.7] text-ink-soft">
        <span className="text-iris">ⓘ HOW SCANNING WORKS</span> — We never crawl the
        internet. One image is sent to Google's reverse-image index; it returns every
        indexed page using it. Private accounts and closed groups are invisible to
        everyone — we say so instead of pretending.
      </div>
    </div>
  );
}
