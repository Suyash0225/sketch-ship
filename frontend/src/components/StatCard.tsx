import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  label: string;
  value: number | string;
  accent?: "violet" | "amber" | "emerald" | "red";
  icon?: ReactNode;
  loading?: boolean;
}

/* Accent maps to the small index tick above the numeral — the card itself
   stays paper-neutral so the ledger reads as one document. */
const ACCENTS: Record<string, string> = {
  violet: "bg-ink",
  amber: "bg-crimson",
  emerald: "bg-verdant",
  red: "bg-brass",
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
  accent = "violet",
  icon,
  loading,
}: Props) {
  const display = useCountUp(value);

  return (
    <div className="bg-card p-4">
      <span className={`block h-1 w-8 ${ACCENTS[accent]}`} />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          {label}
        </p>
        {icon && (
          <span className="text-ink-faint [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        )}
      </div>
      <p className="mt-1 font-display text-4xl font-semibold tabular-nums text-ink">
        {loading ? (
          <span className="skeleton inline-block h-9 w-14 align-middle" />
        ) : (
          display
        )}
      </p>
    </div>
  );
}
