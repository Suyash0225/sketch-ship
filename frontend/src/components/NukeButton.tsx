import { useCallback, useEffect, useRef, useState } from "react";
import Spinner from "./Spinner";

interface Props {
  onClick: () => void;
  disabled?: boolean;
  nuking?: boolean;
  alreadyFiled?: boolean;
  /** Drives the caption copy — real matches can span 4 platforms, not 3. */
  platformCount?: number;
}

/** Hold duration before the notices actually go out. */
const ARM_MS = 1300;
const SIZE = 148;
const RADIUS = (SIZE - 14) / 2;
const CIRC = 2 * Math.PI * RADIUS;

/**
 * Filing a DMCA notice is irreversible, so the button is deliberately hard
 * to hit by accident: press and hold for ARM_MS while a ring fills, and only
 * a completed hold calls onClick. Keyboard users get Enter/Space instead —
 * a hold gesture isn't reachable from the keyboard.
 */
export default function NukeButton({
  onClick,
  disabled,
  nuking,
  alreadyFiled,
  platformCount = 3,
}: Props) {
  const [hold, setHold] = useState(0);
  const raf = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);

  const locked = !!disabled || !!nuking || !!alreadyFiled;

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    startedAt.current = null;
    setHold(0);
  }, []);

  const begin = useCallback(() => {
    if (locked || startedAt.current !== null) return;
    startedAt.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - (startedAt.current ?? now);
      const progress = Math.min(elapsed / ARM_MS, 1);
      setHold(progress);
      if (progress >= 1) {
        stop();
        onClick();
      } else {
        raf.current = requestAnimationFrame(tick);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [locked, onClick, stop]);

  // Release outside the button still has to disarm it.
  useEffect(() => {
    if (hold === 0) return;
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, [hold, stop]);

  useEffect(() => () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
  }, []);

  const caption = alreadyFiled
    ? `✓ DMCA FILED — ${platformCount} PLATFORM${platformCount === 1 ? "" : "S"}`
    : nuking
    ? "FILING NOTICES…"
    : hold > 0
    ? "ARMING…"
    : `HOLD TO FILE EVERYWHERE`;

  return (
    <div className="flex flex-col items-center gap-2.5">
      <button
        type="button"
        onMouseDown={begin}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={(e) => {
          e.preventDefault();
          begin();
        }}
        onTouchEnd={stop}
        onTouchCancel={stop}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !locked) {
            e.preventDefault();
            onClick();
          }
        }}
        disabled={locked}
        aria-label={
          alreadyFiled
            ? "Takedown notices already filed"
            : "Hold to file DMCA takedown notices on all platforms"
        }
        className={`relative grid shrink-0 place-items-center rounded-full border-0 ${
          locked ? "cursor-default" : "cursor-pointer"
        } ${nuking ? "animate-nuke-shake" : ""}`}
        style={{
          width: SIZE,
          height: SIZE,
          background: alreadyFiled
            ? "radial-gradient(circle, #EEF4FD, #FFFFFF)"
            : "radial-gradient(circle at 35% 30%, #FB7185, #E8445A 55%, #B31237)",
          boxShadow: alreadyFiled
            ? "inset 0 0 0 2px #93B4F5, 0 2px 10px rgba(18,35,63,0.08)"
            : `0 0 ${20 + hold * 50}px rgba(232,68,90,${0.35 + hold * 0.5}), inset 0 -8px 20px rgba(0,0,0,0.35)`,
          transform: `scale(${1 - hold * 0.06})`,
          transition: alreadyFiled ? "all 0.5s" : "box-shadow 0.1s",
        }}
      >
        {/* Arming ring — drawn over the disc, never intercepts the press. */}
        <svg
          width={SIZE}
          height={SIZE}
          aria-hidden
          className="pointer-events-none absolute inset-0 -rotate-90"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - hold)}
          />
        </svg>

        <span
          className={`display relative tracking-[0.06em] ${
            alreadyFiled ? "text-[14px] text-iris" : "text-[22px] text-white"
          }`}
        >
          {nuking ? <Spinner size={26} className="text-white" /> : alreadyFiled ? "DETONATED" : "NUKE"}
        </span>
      </button>

      <p
        className={`font-mono text-[10px] font-semibold tracking-[0.1em] ${
          alreadyFiled ? "text-verdant" : nuking ? "text-crimson" : "text-ink-soft"
        }`}
      >
        {caption}
      </p>
    </div>
  );
}
