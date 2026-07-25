import { NavLink } from "react-router-dom";
import { Ghost } from "lucide-react";
import { useAppStatus } from "../context/AppStatusContext";

const LINKS = [
  { to: "/", label: "Docket", end: true },
  { to: "/assets", label: "Exhibits" },
  { to: "/incidents", label: "Cases" },
  { to: "/activity", label: "Record" },
];

function Tally({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="hidden items-baseline gap-1.5 text-[11px] uppercase tracking-[0.12em] text-ink-faint sm:flex">
      <span className="font-semibold tabular-nums text-ink">
        {typeof value === "number" ? String(value).padStart(2, "0") : value}
      </span>
      <span>{label}</span>
    </div>
  );
}

export default function NavBar({ hasProfile }: { hasProfile: boolean | null }) {
  const { stats, backendReachable } = useAppStatus();

  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-sm">
      <div className="rule-double mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 py-4">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 text-ink">
            <Ghost className="h-6 w-6 stroke-[1.75]" />
            <span className="font-display text-xl font-semibold tracking-tight">
              GhostTrace
            </span>
            <span className="mt-0.5 hidden text-[10px] uppercase tracking-[0.22em] text-ink-faint lg:inline">
              · Content Protection Docket
            </span>
          </NavLink>

          <div className="ml-auto flex items-center gap-4">
            <Tally label="Exhibits" value={stats?.assets ?? "–"} />
            <Tally label="Cases" value={stats?.incidents ?? "–"} />
            <Tally label="Filed" value={stats?.filed ?? "–"} />

            <div
              title={
                backendReachable === false
                  ? "Backend unreachable"
                  : backendReachable === null
                  ? "Checking backend…"
                  : "Backend connected"
              }
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  backendReachable === false
                    ? "bg-crimson"
                    : backendReachable === null
                    ? "animate-pulse bg-ink-faint"
                    : "bg-verdant"
                }`}
              />
              <span className="hidden text-ink-faint md:inline">
                {backendReachable === false
                  ? "Offline"
                  : backendReachable === null
                  ? "Connecting"
                  : "On record"}
              </span>
            </div>
          </div>
        </div>

        {hasProfile && (
          <nav className="flex gap-6 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `border-b-2 pb-1.5 transition ${
                    isActive
                      ? "border-crimson text-ink"
                      : "border-transparent text-ink-faint hover:border-line hover:text-ink"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
