import { AlertTriangle } from "lucide-react";

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 border-l-4 border-crimson bg-crimson-wash px-4 py-3 text-xs text-crimson-deep">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="stamp shrink-0 cursor-pointer text-crimson transition hover:bg-crimson hover:text-card"
        >
          Retry
        </button>
      )}
    </div>
  );
}
