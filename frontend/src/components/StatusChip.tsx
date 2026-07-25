interface Props {
  status: string;
}

/* Statuses render as rubber stamps in the ink color of their meaning. */
const STYLES: Record<string, string> = {
  DETECTED: "text-crimson bg-crimson-wash",
  FILED: "text-verdant bg-verdant-wash",
  IN_REVIEW: "text-azure bg-azure-wash",
  RESOLVED: "text-ink-soft bg-well",
  FAILED: "text-crimson-deep bg-crimson-wash",
};

export default function StatusChip({ status }: Props) {
  const style = STYLES[status] ?? "text-ink-soft bg-well";
  const isDetected = status === "DETECTED";
  return (
    <span className={`stamp ${style}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${isDetected ? "animate-pulse" : ""}`}
      />
      {status.replace("_", " ")}
    </span>
  );
}
