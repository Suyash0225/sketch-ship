import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  label: string;
  value: number | string;
  accent?: "violet" | "amber" | "emerald" | "red";
  icon?: ReactNode;
  loading?: boolean;
}

const ACCENTS: Record<string, string> = {
  violet: "from-violet-500/20 to-violet-500/0 text-violet-300",
  amber: "from-amber-500/20 to-amber-500/0 text-amber-300",
  emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
  red: "from-red-500/20 to-red-500/0 text-red-300",
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
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${ACCENTS[accent]} bg-slate-900/60 p-4 shadow-sm`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </p>
        {icon && <span className="[&>svg]:h-5 [&>svg]:w-5 opacity-80">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-white">
        {loading ? (
          <span className="inline-block h-8 w-14 animate-pulse rounded bg-white/10" />
        ) : (
          display
        )}
      </p>
    </div>
  );
}
