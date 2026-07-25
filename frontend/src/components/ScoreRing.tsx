interface Props {
  score: number;
  size?: number;
  strokeWidth?: number;
  /** Small label stacked under the numeral, inside the ring. */
  caption?: string;
}

/* Thresholds come from the UV spec: coral = near-certain, amber = probable,
   blue = worth a look. Anything below 60 never becomes an incident. */
function colorFor(score: number): string {
  if (score >= 90) return "#E8445A"; // danger
  if (score >= 75) return "#D97E06"; // amber
  return "#2563EB"; // uv
}

export default function ScoreRing({ score, size = 92, strokeWidth = 5, caption }: Props) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circumference * (1 - clamped / 100);
  const color = colorFor(clamped);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
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
          strokeLinecap="round"
          className="fill-none transition-[stroke-dashoffset] duration-1000 ease-out"
          style={{
            stroke: color,
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            filter: `drop-shadow(0 0 6px ${color}88)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="display tabular-nums leading-none text-ink"
          style={{ fontSize: size / 4.4 }}
        >
          {score}
        </span>
        {caption && (
          <span
            className="mt-0.5 font-mono font-semibold uppercase tracking-[0.15em] text-ink-faint"
            style={{ fontSize: Math.max(7, size / 11) }}
          >
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
