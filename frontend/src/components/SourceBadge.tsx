import GoogleVisionBadge from "./GoogleVisionBadge";
import type { Incident } from "../lib/api";

interface Props {
  source: Incident["source"];
  size?: "sm" | "md";
}

/**
 * Says out loud where a case came from. "SYNTHETIC" rows are the seeded demo
 * scan; everything else was a genuine reverse-image search of the public web.
 * Being explicit about which is which is a deliberate product decision — see
 * CLAUDE.md §4, "no real crawling in the default path".
 */
export default function SourceBadge({ source, size = "md" }: Props) {
  if (source !== "SYNTHETIC") return <GoogleVisionBadge size={size} />;
  return (
    <span
      title="Seeded demo match — compared by Gemini vision, but not discovered on the live web"
      className="pill border-line bg-well text-ink-faint"
    >
      <span aria-hidden>○</span>
      Demo data
    </span>
  );
}
