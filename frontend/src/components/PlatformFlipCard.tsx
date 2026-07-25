import { Hourglass } from "lucide-react";
import PlatformBadge from "./PlatformBadge";

interface Props {
  platform: string;
  filed: boolean;
  justFiled?: boolean;
  filedAt?: string;
  delayMs?: number;
}

/* A filing receipt per platform; the FILED stamp slams down when filed. */
export default function PlatformFlipCard({ platform, filed, justFiled, filedAt, delayMs = 0 }: Props) {
  return (
    <div
      className={`border p-4 text-center transition-colors duration-300 ${
        filed ? "border-verdant/50 bg-verdant-wash/60" : "border-line bg-card"
      }`}
    >
      <div className="flex flex-col items-center gap-2.5">
        <PlatformBadge platform={platform} />
        {filed ? (
          <>
            <span
              className={`stamp text-sm text-verdant ${justFiled ? "animate-stamp-in" : "stamp-tilt"}`}
              style={justFiled ? { animationDelay: `${delayMs}ms` } : undefined}
            >
              Filed
            </span>
            {filedAt && (
              <p className="text-[10px] tabular-nums text-ink-faint">
                {new Date(filedAt).toLocaleTimeString()}
              </p>
            )}
          </>
        ) : (
          <>
            <Hourglass className="h-5 w-5 text-ink-faint" />
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-faint">
              Awaiting filing
            </p>
          </>
        )}
      </div>
    </div>
  );
}
