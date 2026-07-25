import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Images,
  TriangleAlert,
  ScrollText,
  Ghost,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAppStatus } from "../context/AppStatusContext";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Which DashboardStats field renders as the trailing count chip. */
  count?: "assets" | "incidents";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Monitoring",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
      { to: "/assets", label: "Assets", icon: Images, count: "assets" },
      { to: "/incidents", label: "Incidents", icon: TriangleAlert, count: "incidents" },
    ],
  },
  {
    title: "Records",
    items: [{ to: "/activity", label: "Activity", icon: ScrollText }],
  },
];

interface Props {
  hasProfile: boolean | null;
  /** Mobile drawer state — ignored at md+ where the rail is always shown. */
  open: boolean;
  onClose: () => void;
}

/* Live backend plate — the "◉ BACKEND ONLINE" footer from the UV spec, but
   the dot is driven by the real health poll rather than hardcoded. */
function StatusPlate() {
  const { stats, backendReachable } = useAppStatus();

  const tone =
    backendReachable === false
      ? { text: "text-crimson", bg: "bg-crimson-wash", border: "border-crimson/25", label: "BACKEND OFFLINE" }
      : backendReachable === null
      ? { text: "text-ink-faint", bg: "bg-well", border: "border-line", label: "CONNECTING…" }
      : { text: "text-verdant", bg: "bg-verdant-wash", border: "border-verdant/25", label: "BACKEND ONLINE" };

  return (
    <div className={`rounded-[10px] border px-2.5 py-3 ${tone.bg} ${tone.border}`}>
      <p className={`font-mono text-[9px] font-semibold tracking-[0.12em] ${tone.text}`}>
        <span className={backendReachable === null ? "gt-pulse" : ""}>◉</span> {tone.label}
      </p>
      <p className="mt-1 font-mono text-[9px] tabular-nums text-ink-faint">
        {stats ? `${stats.assets} assets · ${stats.incidents} cases` : "gemini-flash · vision idx"}
      </p>
    </div>
  );
}

export default function Sidebar({ hasProfile, open, onClose }: Props) {
  const { stats } = useAppStatus();

  return (
    <>
      {/* Scrim — mobile only, closes the drawer on tap. */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] md:hidden"
          aria-hidden
        />
      )}

      <aside
        // Fixed drawer under md, sticky rail at md+. bottom-auto clears the
        // inset-y-0 so the sticky variant isn't pinned top AND bottom.
        className={`fixed inset-y-0 left-0 z-50 flex w-[230px] shrink-0 flex-col border-r border-line bg-gradient-to-b from-white to-[#F4F8FE] px-3.5 py-5 transition-transform duration-200 md:sticky md:top-0 md:bottom-auto md:z-30 md:h-screen md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-2 pb-6">
          <NavLink to="/" onClick={onClose} className="flex items-center gap-2.5">
            <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white shadow-[0_0_16px_rgba(37,99,235,0.5)]">
              <Ghost className="h-4 w-4 stroke-[1.75]" />
            </span>
            <span className="leading-tight">
              <span className="display block text-[14.5px] text-ink">GhostTrace</span>
              <span className="block font-mono text-[8px] font-semibold tracking-[0.2em] text-ink-faint">
                LEAK FORENSICS
              </span>
            </span>
          </NavLink>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-ink-faint transition hover:bg-well hover:text-ink md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grouped nav */}
        {hasProfile && (
          <nav className="flex-1 space-y-5 overflow-y-auto">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="eyebrow px-3 pb-2">{section.title}</p>
                <div className="space-y-0.5">
                  {section.items.map(({ to, label, icon: Icon, end, count }) => {
                    const badge = count ? stats?.[count] : undefined;
                    return (
                      <NavLink
                        key={to}
                        to={to}
                        end={end}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-[9px] border-l-2 px-3 py-2.5 text-[13.5px] font-bold transition ${
                            isActive
                              ? "border-l-iris bg-iris/10 text-ink"
                              : "border-l-transparent text-ink-soft hover:bg-iris/5 hover:text-ink"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isActive ? "text-iris" : "text-ink-faint"
                              }`}
                            />
                            <span className="flex-1">{label}</span>
                            {badge !== undefined && badge > 0 && (
                              <span
                                className={`rounded-full px-1.5 py-px font-mono text-[9.5px] tabular-nums ${
                                  isActive
                                    ? "bg-iris text-white"
                                    : "bg-well text-ink-faint ring-1 ring-line"
                                }`}
                              >
                                {badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        )}

        <div className="mt-auto pt-5">
          <StatusPlate />
        </div>
      </aside>
    </>
  );
}
