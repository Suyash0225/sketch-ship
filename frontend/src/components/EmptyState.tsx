import type { ReactNode } from "react";
import { Ghost } from "lucide-react";

interface Props {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-line bg-card/60 px-6 py-16 text-center">
      <span className="mb-3 text-ink-faint [&>svg]:h-10 [&>svg]:w-10 [&>svg]:stroke-[1.5]">
        {icon ?? <Ghost />}
      </span>
      <p className="font-display text-xl text-ink">{title}</p>
      {subtitle && <p className="mt-2 max-w-sm text-xs leading-relaxed text-ink-soft">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
