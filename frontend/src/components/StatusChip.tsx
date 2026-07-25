interface Props {
  status: string;
}

/* Soft-tinted pills: coloured text over a low-alpha wash of the same hue.
   DETECTED is the UV spec's "OPEN" state — amber, awaiting your review. */
const STYLES: Record<string, string> = {
  DETECTED: "text-brass bg-brass-wash border-brass/30",
  FILED: "text-iris-soft bg-iris-wash border-iris/30",
  IN_REVIEW: "text-azure bg-azure-wash border-azure/30",
  RESOLVED: "text-verdant bg-verdant-wash border-verdant/30",
  FAILED: "text-crimson-deep bg-crimson-wash border-crimson/30",
};

const LABEL: Record<string, string> = {
  DETECTED: "Open",
  FILED: "Filed",
  IN_REVIEW: "In review",
  RESOLVED: "Resolved",
  FAILED: "Failed",
};

export default function StatusChip({ status }: Props) {
  const style = STYLES[status] ?? "text-ink-soft bg-well border-line";
  return (
    <span className={`pill ${style}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full bg-current ${
          status === "DETECTED" ? "animate-pulse" : ""
        }`}
      />
      {LABEL[status] ?? status.replace("_", " ")}
    </span>
  );
}
