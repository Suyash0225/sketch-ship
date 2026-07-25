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
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line bg-card/40 px-6 py-16 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl border border-line bg-well text-ink-faint [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.5]">
        {icon ?? <Ghost />}
      </span>
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {subtitle && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-soft">{subtitle}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
