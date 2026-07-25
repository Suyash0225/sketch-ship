import { useEffect, useState } from "react";
import { Play, X as XGlyph, Camera, Globe, Hourglass, Check } from "lucide-react";

interface Props {
  platform: string;
  filed: boolean;
  justFiled?: boolean;
  filedAt?: string;
  delayMs?: number;
}

const ICON: Record<string, typeof Play> = {
  YouTube: Play,
  X: XGlyph,
  Instagram: Camera,
};

/**
 * A filing receipt per platform. The card physically flips to its FILED face
 * when the notice goes out — staggered by delayMs so a nuke reads as three
 * separate filings rather than one state change.
 *
 * Initialised to `filed` rather than false so a page load of an
 * already-filed case shows the receipts immediately, with no phantom flip.
 */
export default function PlatformFlipCard({
  platform,
  filed,
  justFiled,
  filedAt,
  delayMs = 0,
}: Props) {
  const [flipped, setFlipped] = useState(filed);
  const Icon = ICON[platform] ?? Globe;

  useEffect(() => {
    if (!filed || flipped) return;
    // Only a live filing gets the stagger; a remount lands flat.
    if (!justFiled) {
      setFlipped(true);
      return;
    }
    const t = window.setTimeout(() => setFlipped(true), delayMs);
    return () => window.clearTimeout(t);
  }, [filed, flipped, justFiled, delayMs]);

  const face =
    "absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-[10px] border [backface-visibility:hidden]";

  return (
    <div className="min-w-[110px] flex-1 [perspective:600px]">
      <div
        className="relative h-[92px] [transform-style:preserve-3d]"
        style={{
          transition: "transform 0.6s cubic-bezier(.3,1.4,.4,1)",
          transform: flipped ? "rotateY(180deg)" : "none",
        }}
      >
        {/* Front — awaiting filing */}
        <div className={`${face} border-line bg-well`}>
          <Icon className="h-[18px] w-[18px] text-ink-soft" aria-hidden />
          <p className="text-[12.5px] font-bold text-ink">{platform}</p>
          <p className="flex items-center gap-1 font-mono text-[9px] tracking-[0.12em] text-ink-faint">
            <Hourglass className="h-2.5 w-2.5" aria-hidden /> PENDING
          </p>
        </div>

        {/* Back — filed */}
        <div className={`${face} border-iris bg-iris/10 [transform:rotateY(180deg)]`}>
          <Icon className="h-[18px] w-[18px] text-iris" aria-hidden />
          <p className="text-[12.5px] font-bold text-ink">{platform}</p>
          <p className="flex items-center gap-1 font-mono text-[9px] tracking-[0.12em] text-iris-soft">
            <Check className="h-2.5 w-2.5" aria-hidden /> FILED
          </p>
          {filedAt && (
            <p className="font-mono text-[9px] tabular-nums text-ink-faint">
              {new Date(filedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
