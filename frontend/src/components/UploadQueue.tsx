import { CheckCircle2, RotateCw, X, AlertTriangle, Minimize2 } from "lucide-react";
import Spinner from "./Spinner";
import { formatBytes } from "../lib/upload";

export type UploadStage =
  | "queued"
  | "preparing"
  | "uploading"
  | "analyzing"
  | "done"
  | "error"
  | "cancelled";

export interface UploadItem {
  id: string;
  fileName: string;
  previewUrl: string;
  originalBytes: number;
  /** Set once the canvas pass has run; undefined while still preparing. */
  sentBytes?: number;
  compressed: boolean;
  stage: UploadStage;
  /** 0→1, transfer only. Ignored for indeterminate stages. */
  progress: number;
  error?: string;
  subject?: string;
}

const STAGE_LABEL: Record<UploadStage, string> = {
  queued: "Queued",
  preparing: "Optimising",
  uploading: "Uploading",
  analyzing: "Fingerprinting",
  done: "Filed",
  error: "Failed",
  cancelled: "Cancelled",
};

const STAGE_TONE: Record<UploadStage, string> = {
  queued: "text-ink-faint",
  preparing: "text-brass",
  uploading: "text-iris-soft",
  analyzing: "text-iris-soft",
  done: "text-verdant",
  error: "text-crimson",
  cancelled: "text-ink-faint",
};

function Row({
  item,
  onRetry,
  onDismiss,
}: {
  item: UploadItem;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const indeterminate = item.stage === "preparing" || item.stage === "analyzing";
  const settled = item.stage === "done" || item.stage === "error" || item.stage === "cancelled";
  const pct = item.stage === "done" ? 100 : Math.round(item.progress * 100);

  return (
    <li className="animate-intake flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line bg-well">
        <img
          src={item.previewUrl}
          alt=""
          className={`h-full w-full object-cover transition ${
            item.stage === "done" ? "" : "opacity-55 grayscale"
          }`}
        />
        {item.stage === "done" && (
          <span className="absolute inset-0 flex items-center justify-center bg-verdant/15">
            <CheckCircle2 className="h-4 w-4 text-verdant" />
          </span>
        )}
        {item.stage === "error" && (
          <span className="absolute inset-0 flex items-center justify-center bg-crimson/15">
            <AlertTriangle className="h-4 w-4 text-crimson" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[13px] font-medium text-ink">
            {item.subject ?? item.fileName}
          </p>
          <p className={`shrink-0 text-[11px] font-medium ${STAGE_TONE[item.stage]}`}>
            {STAGE_LABEL[item.stage]}
            {item.stage === "uploading" && ` ${pct}%`}
          </p>
        </div>

        <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-well">
          <div
            className={`h-full rounded-full transition-[width] duration-200 ease-out ${
              indeterminate ? "progress-indeterminate w-full" : ""
            } ${item.stage === "done" ? "bg-verdant" : ""} ${
              item.stage === "error" || item.stage === "cancelled" ? "bg-crimson/60" : ""
            } ${item.stage === "uploading" ? "bg-iris" : ""}`}
            style={indeterminate ? undefined : { width: `${settled ? 100 : pct}%` }}
          />
        </div>

        <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-ink-faint">
          {item.error ? (
            <span className="text-crimson">{item.error}</span>
          ) : item.compressed && item.sentBytes !== undefined ? (
            <>
              <Minimize2 className="h-3 w-3 shrink-0" />
              {formatBytes(item.originalBytes)} → {formatBytes(item.sentBytes)}
              <span className="text-verdant">
                (−{Math.round((1 - item.sentBytes / item.originalBytes) * 100)}%)
              </span>
            </>
          ) : (
            formatBytes(item.sentBytes ?? item.originalBytes)
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {item.stage === "error" && (
          <button
            type="button"
            onClick={() => onRetry(item.id)}
            title="Retry"
            className="cursor-pointer rounded-md border border-line p-1 text-ink-soft transition hover:border-line-strong hover:bg-well hover:text-ink"
          >
            <RotateCw className="h-3 w-3" />
          </button>
        )}
        {settled ? (
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            title="Dismiss"
            className="cursor-pointer border border-transparent p-1 text-ink-faint transition hover:border-line hover:text-ink"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <Spinner size={12} className="text-ink-faint" />
        )}
      </div>
    </li>
  );
}

interface Props {
  items: UploadItem[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onClearFinished: () => void;
}

export default function UploadQueue({ items, onRetry, onDismiss, onClearFinished }: Props) {
  if (items.length === 0) return null;

  const done = items.filter((i) => i.stage === "done").length;
  const failed = items.filter((i) => i.stage === "error").length;
  const active = items.length - done - failed;
  const overall = Math.round(
    (items.reduce((sum, i) => sum + (i.stage === "done" ? 1 : i.progress), 0) / items.length) * 100
  );

  return (
    <section className="surface overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">Upload queue</h2>
          <p className="text-[12px] tabular-nums text-ink-faint">
            {done}/{items.length} done
            {failed > 0 && <span className="ml-2 text-crimson">{failed} failed</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-[3px] w-28 overflow-hidden rounded-full bg-well">
            <div
              className="h-full rounded-full bg-iris transition-[width] duration-300 ease-out"
              style={{ width: `${overall}%` }}
            />
          </div>
          {active === 0 && (
            <button
              type="button"
              onClick={onClearFinished}
              className="cursor-pointer text-[12px] font-medium text-ink-faint transition hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Capped height so a 200-file drop can't push the grid off-screen. */}
      <ul className="max-h-72 overflow-y-auto">
        {items.map((item) => (
          <Row key={item.id} item={item} onRetry={onRetry} onDismiss={onDismiss} />
        ))}
      </ul>
    </section>
  );
}
