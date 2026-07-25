interface Props {
  status: string;
}

const STYLES: Record<string, string> = {
  DETECTED: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  FILED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  IN_REVIEW: "bg-blue-500/15 text-blue-400 border-blue-500/40",
  RESOLVED: "bg-zinc-400/15 text-zinc-300 border-zinc-400/40",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/40",
};

export default function StatusChip({ status }: Props) {
  const style = STYLES[status] ?? "bg-zinc-500/15 text-zinc-300 border-zinc-500/40";
  const isDetected = status === "DETECTED";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${style}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${
          isDetected ? "animate-pulse" : ""
        }`}
      />
      {status.replace("_", " ")}
    </span>
  );
}
