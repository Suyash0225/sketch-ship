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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-900/40 px-6 py-16 text-center">
      <span className="mb-3 text-slate-500 opacity-70 [&>svg]:h-10 [&>svg]:w-10">
        {icon ?? <Ghost />}
      </span>
      <p className="text-base font-semibold text-slate-200">{title}</p>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-slate-400">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
