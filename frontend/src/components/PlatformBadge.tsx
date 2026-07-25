import { Play, X as XGlyph, Camera } from "lucide-react";

interface Props {
  platform: string;
  size?: "sm" | "md";
}

const ICON: Record<string, typeof Play> = {
  YouTube: Play,
  X: XGlyph,
  Instagram: Camera,
};

/* Platforms are metadata, not brands, in a case file — quiet ink tags. */
export default function PlatformBadge({ platform, size = "md" }: Props) {
  const Icon = ICON[platform];
  const pad = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-0.5";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border border-ink/30 bg-card text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft ${pad}`}
    >
      {Icon ? (
        <Icon className={iconSize} aria-hidden />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {platform}
    </span>
  );
}
