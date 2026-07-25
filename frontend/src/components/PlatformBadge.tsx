import { Play, X as XGlyph, Camera, Globe } from "lucide-react";

interface Props {
  platform: string;
  size?: "sm" | "md";
}

const ICON: Record<string, typeof Play> = {
  YouTube: Play,
  X: XGlyph,
  Instagram: Camera,
};

/* Real SerpApi matches land on arbitrary domains, so anything without a
   dedicated icon falls back to a globe rather than a bare dot. */
export default function PlatformBadge({ platform, size = "md" }: Props) {
  const Icon = ICON[platform] ?? Globe;
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span className="pill border-line bg-well text-ink-soft">
      <Icon className={`${iconSize} shrink-0`} aria-hidden />
      {platform}
    </span>
  );
}
