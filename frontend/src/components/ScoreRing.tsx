interface Props {
  score: number;
  size?: number;
  strokeWidth?: number;
  caption?: string;
}

function colorFor(score: number): string {
  if (score >= 85) return "#b23a30"; // crimson — near-certain match
  if (score >= 60) return "#96762a"; // brass — probable
  return "#6b6353"; // soft ink — inconclusive
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
            className="fill-none stroke-line"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            className="fill-none transition-[stroke-dashoffset] duration-700 ease-out"
            style={{ stroke: color, strokeDasharray: circumference, strokeDashoffset: offset }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-display font-semibold tabular-nums text-ink"
            style={{ fontSize: size * 0.3 }}
          >
            {score}
          </span>
        </div>
      </div>
      {caption && (
        <p className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">{caption}</p>
      )}
    </div>
  );
}
