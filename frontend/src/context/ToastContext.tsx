import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function Icon({ kind }: { kind: ToastKind }) {
  switch (kind) {
    case "success":
      return <CheckCircle2 className="h-4 w-4" />;
    case "error":
      return <CircleAlert className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
}

function ringClasses(kind: ToastKind) {
  switch (kind) {
    case "success":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "error":
      return "border-red-500/40 bg-red-500/10 text-red-300";
    default:
      return "border-violet-500/40 bg-violet-500/10 text-violet-300";
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-toast-in pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-md ${ringClasses(
              t.kind
            )}`}
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/20">
              <Icon kind={t.kind} />
            </span>
            <p className="text-sm leading-snug text-slate-100">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-auto text-slate-400 hover:text-slate-200"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside a ToastProvider");
  return ctx;
}
