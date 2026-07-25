import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getDashboardStats, type DashboardStats } from "../lib/api";

interface AppStatusValue {
  stats: DashboardStats | null;
  statsLoading: boolean;
  backendReachable: boolean | null; // null = not checked yet
  refreshStats: () => Promise<void>;
}

const AppStatusContext = createContext<AppStatusValue | null>(null);

const POLL_MS = 8000;

export function AppStatusProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [backendReachable, setBackendReachable] = useState<boolean | null>(null);
  const mounted = useRef(true);

  const refreshStats = useCallback(async () => {
    try {
      const s = await getDashboardStats();
      if (!mounted.current) return;
      setStats(s);
      setBackendReachable(true);
    } catch {
      if (!mounted.current) return;
      setBackendReachable(false);
    } finally {
      if (mounted.current) setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refreshStats();
    const id = window.setInterval(refreshStats, POLL_MS);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
    };
  }, [refreshStats]);

  return (
    <AppStatusContext.Provider
      value={{ stats, statsLoading, backendReachable, refreshStats }}
    >
      {children}
    </AppStatusContext.Provider>
  );
}

export function useAppStatus(): AppStatusValue {
  const ctx = useContext(AppStatusContext);
  if (!ctx) throw new Error("useAppStatus must be used inside AppStatusProvider");
  return ctx;
}
