import { Play, X as XGlyph, Camera } from "lucide-react";

interface Props {
  platform: string;
  size?: "sm" | "md";
}

const STYLES: Record<string, string> = {
  YouTube: "bg-red-500/15 text-red-400 border-red-500/40",
  X: "bg-slate-200/10 text-slate-100 border-slate-300/30",
  Instagram: "bg-pink-500/15 text-pink-400 border-pink-500/40",
};

const ICON: Record<string, typeof Play> = {
  YouTube: Play,
  X: XGlyph,
  Instagram: Camera,
};

export default function PlatformBadge({ platform, size = "md" }: Props) {
  const style = STYLES[platform] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/40";
  const Icon = ICON[platform];
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide ${pad} ${style}`}
    >
      {Icon ? <Icon className={iconSize} aria-hidden /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {platform}
    </span>
  );
}
