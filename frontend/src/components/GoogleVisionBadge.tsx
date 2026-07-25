interface Props {
  size?: "sm" | "md";
}

// Google's four brand colors as a tiny inline "G" mark — avoids pulling in
// an icon font/asset just for one badge.
export default function GoogleVisionBadge({ size = "md" }: Props) {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span
      title="Found by a real Google reverse-image search of the public web, not the seeded demo scan"
      className="pill border-verdant/35 bg-verdant-wash text-verdant"
    >
      <span aria-hidden>◉</span>
      <svg viewBox="0 0 24 24" className={`${iconSize} shrink-0`} aria-hidden>
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.27a12 12 0 0 0 0 10.74l4-3.09Z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.63l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
      </svg>
      Live detection
    </span>
  );
}
