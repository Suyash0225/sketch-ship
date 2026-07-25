import { CheckCircle2, Hourglass } from "lucide-react";
import PlatformBadge from "./PlatformBadge";

interface Props {
  platform: string;
  filed: boolean;
  justFiled?: boolean;
  filedAt?: string;
  delayMs?: number;
}

export default function PlatformFlipCard({ platform, filed, justFiled, filedAt, delayMs = 0 }: Props) {
  return (
    <div
      className={`perspective-1000 rounded-xl border p-4 text-center transition-colors duration-300 ${
        filed
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-white/10 bg-slate-900/50"
      } ${justFiled ? "animate-flip-in" : ""}`}
      style={justFiled ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <div className="flex flex-col items-center gap-2">
        <PlatformBadge platform={platform} />
        {filed ? (
          <>
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">Filed</p>
            {filedAt && (
              <p className="text-[11px] text-slate-500">
                {new Date(filedAt).toLocaleTimeString()}
              </p>
            )}
          </>
        ) : (
          <>
            <Hourglass className="h-6 w-6 opacity-40" />
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending</p>
          </>
        )}
      </div>
    </div>
  );
}
