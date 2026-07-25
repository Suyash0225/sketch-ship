import { Bomb, CheckCircle2 } from "lucide-react";
import Spinner from "./Spinner";

interface Props {
  onClick: () => void;
  disabled?: boolean;
  nuking?: boolean;
  alreadyFiled?: boolean;
}

export default function NukeButton({ onClick, disabled, nuking, alreadyFiled }: Props) {
  const idle = !disabled && !nuking && !alreadyFiled;
  return (
    <button
      onClick={onClick}
      disabled={disabled || nuking || alreadyFiled}
      className={`group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 px-6 py-5 text-lg font-extrabold uppercase tracking-widest text-white shadow-2xl transition-all duration-150 disabled:cursor-not-allowed ${
        alreadyFiled
          ? "border-emerald-500/40 bg-emerald-600/30 text-emerald-200"
          : "border-red-500 bg-gradient-to-b from-red-600 to-red-800 shadow-red-900/50 hover:scale-[1.015] hover:from-red-500 hover:to-red-700 active:scale-95"
      } ${nuking ? "animate-nuke-shake" : ""} ${idle ? "animate-danger-glow" : ""}`}
    >
      <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-full" />
      {alreadyFiled ? (
        <>
          <CheckCircle2 className="h-5 w-5" /> Takedown Filed
        </>
      ) : nuking ? (
        <>
          <Spinner size={22} />
          Filing on all platforms…
        </>
      ) : (
        <>
          <Bomb className="h-5 w-5" /> NUKE — File DMCA Everywhere
        </>
      )}
    </button>
  );
}
