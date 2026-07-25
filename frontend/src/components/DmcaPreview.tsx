import { useState } from "react";
import { Check, Copy, FileText } from "lucide-react";
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
    <div className="surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
          <FileText className="h-3.5 w-3.5 text-ink-faint" />
          DMCA notice · {platform}
        </p>
        {status === "filed" && (
          <span className="pill border-verdant/25 bg-verdant-wash text-verdant">
            Filed{filedAt ? ` · ${new Date(filedAt).toLocaleTimeString()}` : ""}
          </span>
        )}
        {status === "preview" && (
          <span className="pill border-brass/25 bg-brass-wash text-brass">Draft</span>
        )}
      </div>

      {status === "idle" && (
        <button onClick={onGenerate} className="btn btn-secondary w-full">
          Draft notice for {platform}
        </button>
      )}

      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-ink-soft">
          <Spinner size={16} />
          Drafting with Gemini…
        </div>
      )}

      {status === "error" && (
        <div className="space-y-3">
          <p className="text-[13px] text-crimson">
            {errorMessage ?? "Could not generate preview."}
          </p>
          <button onClick={onGenerate} className="btn btn-secondary">
            Retry
          </button>
        </div>
      )}

      {(status === "preview" || status === "filed") && noticeText && (
        <div className="relative">
          <div className="relative max-h-80 overflow-auto rounded-[10px] border border-line bg-paper">
            <pre className="whitespace-pre-wrap px-4 py-4 font-mono text-[12px] leading-relaxed text-ink-soft">
              {noticeText}
            </pre>
          </div>
          <button
            onClick={copy}
            className="btn btn-secondary absolute bottom-2.5 right-2.5 px-2.5 py-1 text-[11px]"
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
