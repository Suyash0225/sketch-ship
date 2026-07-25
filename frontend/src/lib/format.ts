/** Shared display formatters. Kept dependency-free — no date lib. */

/** "Jul 25, 2026, 11:40 AM" — falls back to the raw ISO string if unparseable. */
export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Compact relative time for the dashboard activity strip: "3m ago". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

/**
 * Docket-style case number from an opaque incident id — the legal-file look
 * the Incident Room leans on. Deterministic: same id always renders the same.
 */
export function caseNo(id: string): string {
  const digits = id.replace(/\D/g, "");
  const tail = digits.length >= 4
    ? digits.slice(-4)
    : String(
        [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 10000, 7)
      ).padStart(4, "0");
  return `GT-${tail}`;
}
