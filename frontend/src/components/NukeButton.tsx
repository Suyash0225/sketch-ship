import { Stamp, CheckCircle2 } from "lucide-react";
import Spinner from "./Spinner";

interface Props {
  onClick: () => void;
  disabled?: boolean;
  nuking?: boolean;
  alreadyFiled?: boolean;
}

export default function NukeButton({ onClick, disabled, nuking, alreadyFiled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || nuking || alreadyFiled}
      className={`group relative flex w-full cursor-pointer items-center justify-center gap-3 border-3 border-double px-6 py-5 font-mono text-base font-bold uppercase tracking-[0.2em] transition-all duration-150 disabled:cursor-not-allowed ${
        alreadyFiled
          ? "border-verdant bg-verdant-wash text-verdant"
          : "border-crimson-deep bg-crimson text-card shadow-[4px_4px_0_0_#211d14] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#211d14] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_#211d14]"
      } ${nuking ? "animate-nuke-shake" : ""}`}
    >
      {alreadyFiled ? (
        <>
          <CheckCircle2 className="h-5 w-5" /> Takedown Filed
        </>
      ) : nuking ? (
        <>
          <Spinner size={20} />
          Filing on all platforms…
        </>
      ) : (
        <>
          <Stamp className="h-5 w-5" /> File DMCA — Everywhere
        </>
      )}
    </button>
  );
}
