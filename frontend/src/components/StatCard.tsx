import { useEffect, useRef, useState, type ReactNode } from "react";

export type StatAccent = "ink" | "uv" | "amber" | "mint" | "danger";

interface Props {
  label: string;
  value: number | string;
  accent?: StatAccent;
  /** Mono caption under the numeral — says what the number actually means. */
  sub?: string;
  icon?: ReactNode;
  loading?: boolean;
}

/* Accent tints the numeral, the icon chip and the hairline along the top
   edge. Card surfaces stay white so a row of them reads as one panel. */
const ACCENTS: Record<StatAccent, { numeral: string; tick: string; chip: string }> = {
  ink: { numeral: "text-ink", tick: "from-ink-faint", chip: "border-line bg-well text-ink-soft" },
  uv: { numeral: "text-iris", tick: "from-iris", chip: "border-iris/25 bg-iris-wash text-iris-soft" },
  amber: { numeral: "text-brass", tick: "from-brass", chip: "border-brass/25 bg-brass-wash text-brass" },
  mint: { numeral: "text-verdant", tick: "from-verdant", chip: "border-verdant/25 bg-verdant-wash text-verdant" },
  danger: { numeral: "text-crimson", tick: "from-crimson", chip: "border-crimson/25 bg-crimson-wash text-crimson" },
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(value: number | string, durationMs = 700): number | string {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);

  useEffect(() => {
    if (typeof value !== "number") {
      setDisplay(value);
      return;
    }
    const from = typeof fromRef.current === "number" ? fromRef.current : 0;
    const start = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const current = Math.round(from + (value - from) * easeOutCubic(t));
      setDisplay(current);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return display;
}

export default function StatCard({
  label,
  value,
  accent = "uv",
  sub,
  icon,
  loading,
}: Props) {
  const display = useCountUp(value);
  const tone = ACCENTS[accent] ?? ACCENTS.uv;

  return (
    <div className="surface surface-hover relative overflow-hidden px-5 py-[18px]">
      {/* Accent hairline that fades out across the top edge. */}
      <span
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tone.tick} to-transparent opacity-70`}
      />
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow">{label}</p>
        {icon && (
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${tone.chip} [&>svg]:h-3.5 [&>svg]:w-3.5`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className={`display mt-2 text-[32px] leading-none tabular-nums ${tone.numeral}`}>
        {loading ? (
          <span className="skeleton inline-block h-8 w-16 align-middle" />
        ) : (
          display
        )}
      </p>
      {sub && <p className="mt-1.5 font-mono text-[10px] text-ink-faint">{sub}</p>}
    </div>
  );
}
