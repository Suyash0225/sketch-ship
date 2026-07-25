import { NavLink } from "react-router-dom";
import { Ghost } from "lucide-react";
import { useAppStatus } from "../context/AppStatusContext";

const LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/assets", label: "Assets" },
  { to: "/incidents", label: "Incidents" },
  { to: "/activity", label: "Activity" },
];

function MiniStat({
  label,
  value,
  dotClass,
}: {
  label: string;
  value: number | string;
  dotClass: string;
}) {
  return (
    <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 sm:flex">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span className="tabular-nums text-white">{value}</span>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}

export default function NavBar({ hasProfile }: { hasProfile: boolean | null }) {
  const { stats, backendReachable } = useAppStatus();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <NavLink to="/" className="flex shrink-0 items-center gap-2 font-bold text-white">
          <Ghost className="h-6 w-6 text-violet-400 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
          <span className="hidden sm:inline">GhostTrace</span>
        </NavLink>

        {hasProfile && (
          <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-sm">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 font-medium transition ${
                    isActive
                      ? "bg-violet-500/90 text-white shadow"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          <MiniStat label="assets" value={stats?.assets ?? "–"} dotClass="bg-violet-400" />
          <MiniStat label="incidents" value={stats?.incidents ?? "–"} dotClass="bg-amber-400" />
          <MiniStat label="filed" value={stats?.filed ?? "–"} dotClass="bg-emerald-400" />

          <div
            title={
              backendReachable === false
                ? "Backend unreachable"
                : backendReachable === null
                ? "Checking backend…"
                : "Backend connected"
            }
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                backendReachable === false
                  ? "bg-red-500"
                  : backendReachable === null
                  ? "bg-zinc-500 animate-pulse"
                  : "bg-emerald-500"
              }`}
            />
            <span className="hidden text-slate-400 md:inline">
              {backendReachable === false
                ? "offline"
                : backendReachable === null
                ? "connecting"
                : "online"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
