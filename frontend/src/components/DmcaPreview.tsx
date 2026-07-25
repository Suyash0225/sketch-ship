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
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">
          DMCA Notice — {platform}
        </p>
        {status === "filed" && (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
            FILED{filedAt ? ` · ${new Date(filedAt).toLocaleTimeString()}` : ""}
          </span>
        )}
        {status === "preview" && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-300">
            PREVIEW ONLY
          </span>
        )}
      </div>

      {status === "idle" && (
        <button
          onClick={onGenerate}
          className="w-full rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20"
        >
          Generate DMCA preview for {platform}
        </button>
      )}

      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
          <Spinner size={18} />
          Drafting notice with Gemini…
        </div>
      )}

      {status === "error" && (
        <div className="space-y-2">
          <p className="text-sm text-red-300">{errorMessage ?? "Could not generate preview."}</p>
          <button
            onClick={onGenerate}
            className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/10"
          >
            Retry
          </button>
        </div>
      )}

      {(status === "preview" || status === "filed") && noticeText && (
        <div className="relative">
          <pre className="max-h-80 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-300">
            {noticeText}
          </pre>
          <button
            onClick={copy}
            className="absolute top-2 right-2 flex items-center gap-1 rounded-md border border-white/15 bg-slate-900/90 px-2.5 py-1 text-xs font-medium text-slate-200 shadow transition hover:bg-slate-800"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" /> Copied
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
