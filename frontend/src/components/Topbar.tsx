import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, Bell, ChevronRight } from "lucide-react";
import { useAppStatus } from "../context/AppStatusContext";
import type { CreatorProfile } from "../lib/api";
import { caseNo } from "../lib/format";

interface Props {
  profile: CreatorProfile | null;
  onOpenMenu: () => void;
}

/** Route → page heading + breadcrumb trail shown on the left of the bar. */
function crumbsFor(pathname: string): { title: string; trail: { label: string; to?: string }[] } {
  if (pathname.startsWith("/assets")) {
    return { title: "Assets", trail: [{ label: "Monitoring" }, { label: "Assets" }] };
  }
  if (pathname.startsWith("/incidents/")) {
    const id = pathname.split("/")[2] ?? "";
    return {
      title: `Case ${caseNo(id)}`,
      trail: [
        { label: "Monitoring" },
        { label: "Incidents", to: "/incidents" },
        { label: `Case ${caseNo(id)}` },
      ],
    };
  }
  if (pathname.startsWith("/incidents")) {
    return { title: "Incidents", trail: [{ label: "Monitoring" }, { label: "Incidents" }] };
  }
  if (pathname.startsWith("/activity")) {
    return { title: "Activity", trail: [{ label: "Records" }, { label: "Activity" }] };
  }
  if (pathname.startsWith("/onboarding")) {
    return { title: "Set up", trail: [{ label: "Claimant registration" }] };
  }
  return { title: "Dashboard", trail: [{ label: "Monitoring" }, { label: "Dashboard" }] };
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GT";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function Topbar({ profile, onOpenMenu }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { stats, backendReachable } = useAppStatus();
  const [query, setQuery] = useState("");

  const { title, trail } = crumbsFor(pathname);
  // stats.incidents is the total case count, not an unread badge — the label
  // says "cases", not "new".
  const caseCount = stats?.incidents ?? 0;

  // The bar's search is the asset catalogue's search — hand the term to the
  // Assets page via the URL rather than keeping a second, fake index here.
  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/assets?q=${encodeURIComponent(q)}` : "/assets");
  };

  return (
    <header className="chrome sticky top-0 z-30">
      <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
        <button
          onClick={onOpenMenu}
          className="cursor-pointer rounded-md p-1.5 text-ink-soft transition hover:bg-well hover:text-ink md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        {/* Title + breadcrumb */}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold leading-tight text-ink">{title}</h2>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Breadcrumb">
            {trail.map((c, i) => (
              <span key={`${c.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-2.5 w-2.5 text-ink-faint" aria-hidden />}
                {c.to ? (
                  <Link
                    to={c.to}
                    className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint transition hover:text-iris-soft"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span
                    className={`font-mono text-[9.5px] uppercase tracking-[0.14em] ${
                      i === trail.length - 1 ? "text-iris" : "text-ink-faint"
                    }`}
                  >
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Search — collapses to an icon-only field on narrow screens. */}
        {profile && (
          <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 lg:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search assets, hashes, descriptions…"
                aria-label="Search assets"
                className="input bg-white pl-9"
              />
            </div>
          </form>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Backend health */}
          <span
            title={
              backendReachable === false
                ? "Backend unreachable"
                : backendReachable === null
                ? "Checking backend…"
                : "Backend connected"
            }
            className="hidden items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 font-mono text-[9.5px] tracking-[0.1em] sm:flex"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                backendReachable === false
                  ? "bg-crimson shadow-[0_0_8px_rgba(232,68,90,0.9)]"
                  : backendReachable === null
                  ? "animate-pulse bg-ink-faint"
                  : "bg-verdant shadow-[0_0_8px_rgba(14,159,126,0.9)]"
              }`}
            />
            <span className="text-ink-soft">
              {backendReachable === false ? "OFFLINE" : backendReachable === null ? "SYNC" : "LIVE"}
            </span>
          </span>

          {/* Open-case bell */}
          {profile && (
            <Link
              to="/incidents"
              title={`${caseCount} case${caseCount === 1 ? "" : "s"} on file`}
              className="relative cursor-pointer rounded-md p-1.5 text-ink-soft transition hover:bg-well hover:text-ink"
            >
              <Bell className="h-4 w-4" />
              {caseCount > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-crimson px-1 font-mono text-[8px] font-bold text-white">
                  {caseCount > 99 ? "99+" : caseCount}
                </span>
              )}
            </Link>
          )}

          {/* Claimant of record */}
          {profile && (
            <div className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-[10px] font-bold text-white">
                {initialsOf(profile.name)}
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-[12px] font-bold text-ink">{profile.name}</span>
                <span className="block font-mono text-[8.5px] tracking-[0.1em] text-ink-faint">
                  CLAIMANT OF RECORD
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
