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

function accentClasses(kind: ToastKind) {
  switch (kind) {
    case "success":
      return "border-verdant text-verdant shadow-[0_8px_30px_rgba(18,35,63,0.18),0_0_20px_rgba(14,159,126,0.2)]";
    case "error":
      return "border-crimson text-crimson shadow-[0_8px_30px_rgba(18,35,63,0.18),0_0_20px_rgba(232,68,90,0.2)]";
    default:
      return "border-iris text-iris-soft shadow-[0_8px_30px_rgba(18,35,63,0.18),0_0_20px_rgba(37,99,235,0.2)]";
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
      {/* Bottom-centre, over the content — the UV spec puts confirmations in
          the operator's line of sight rather than off in a corner. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-toast-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[10px] border bg-raised px-5 py-3 ${accentClasses(
              t.kind
            )}`}
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
              <Icon kind={t.kind} />
            </span>
            <p className="font-mono text-[11.5px] leading-relaxed text-ink">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-auto cursor-pointer text-ink-faint hover:text-ink"
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
