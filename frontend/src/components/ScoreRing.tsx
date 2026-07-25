interface Props {
  score: number;
  size?: number;
  strokeWidth?: number;
  caption?: string;
}

function colorFor(score: number): string {
  if (score >= 85) return "#f87171";
  if (score >= 60) return "#fbbf24";
  return "#cbd5e1";
}

export default function ScoreRing({ score, size = 56, strokeWidth = 5, caption }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);
  const color = colorFor(score);

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className="fill-none stroke-white/10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="fill-none transition-[stroke-dashoffset] duration-700 ease-out"
            style={{ stroke: color, strokeDasharray: circumference, strokeDashoffset: offset }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold tabular-nums text-white"
            style={{ fontSize: size * 0.28 }}
          >
            {score}
          </span>
        </div>
      </div>
      {caption && <p className="text-xs text-slate-500">{caption}</p>}
    </div>
  );
}
