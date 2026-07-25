import { AlertTriangle } from "lucide-react";

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[10px] border border-crimson/25 bg-crimson-wash px-4 py-3 text-[13px] text-crimson-deep">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary shrink-0 px-2.5 py-1 text-[12px]">
          Retry
        </button>
      )}
    </div>
  );
}
