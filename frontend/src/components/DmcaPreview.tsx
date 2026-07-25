import { useState } from "react";
import { Check, Copy } from "lucide-react";
import Spinner from "./Spinner";

interface Props {
  platform: string;
  status: "idle" | "loading" | "preview" | "filed" | "error";
  noticeText?: string;
  filedAt?: string;
  errorMessage?: string;
  onGenerate: () => void;
}

/* The notice renders as the typed legal document it is: a white sheet with a
   red margin rule, and a FILED stamp struck across the corner once filed. */
export default function DmcaPreview({
  platform,
  status,
  noticeText,
  filedAt,
  errorMessage,
  onGenerate,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!noticeText) return;
    try {
      await navigator.clipboard.writeText(noticeText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable — ignore silently, this is a demo nicety
    }
  };

  return (
    <div className="border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink">
          DMCA Notice — {platform}
        </p>
        {status === "filed" && (
          <span className="stamp stamp-tilt text-verdant">
            Filed{filedAt ? ` · ${new Date(filedAt).toLocaleTimeString()}` : ""}
          </span>
        )}
        {status === "preview" && (
          <span className="stamp stamp-tilt text-brass">Draft — not filed</span>
        )}
      </div>

      {status === "idle" && (
        <button
          onClick={onGenerate}
          className="w-full cursor-pointer border border-ink bg-card px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink transition hover:bg-ink hover:text-card"
        >
          Draft DMCA notice for {platform}
        </button>
      )}

      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-ink-soft">
          <Spinner size={18} />
          Drafting notice with Gemini…
        </div>
      )}

      {status === "error" && (
        <div className="space-y-2">
          <p className="text-xs text-crimson-deep">{errorMessage ?? "Could not generate preview."}</p>
          <button
            onClick={onGenerate}
            className="stamp cursor-pointer text-crimson transition hover:bg-crimson hover:text-card"
          >
            Retry
          </button>
        </div>
      )}

      {(status === "preview" || status === "filed") && noticeText && (
        <div className="relative">
          <div className="relative max-h-80 overflow-auto border border-line bg-white shadow-[2px_3px_0_0_rgba(33,29,20,0.08)]">
            {/* red margin rule, like a typed legal sheet */}
            <span className="pointer-events-none absolute inset-y-0 left-9 w-px bg-crimson/30" />
            <pre className="whitespace-pre-wrap py-4 pl-14 pr-6 font-mono text-xs leading-relaxed text-ink">
              {noticeText}
            </pre>
            {status === "filed" && (
              <span className="stamp pointer-events-none absolute right-4 top-4 rotate-[-8deg] text-base text-verdant/80">
                Filed
              </span>
            )}
          </div>
          <button
            onClick={copy}
            className="absolute bottom-2 right-2 flex cursor-pointer items-center gap-1 border border-line bg-card px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft shadow transition hover:bg-well"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-verdant" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
