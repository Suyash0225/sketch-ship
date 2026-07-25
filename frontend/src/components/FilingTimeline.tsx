import { Radar, CheckCircle2, ArrowRight } from "lucide-react";
import type { Incident, Platform, Takedown } from "../lib/api";

interface Props {
  incident: Incident;
  takedowns: Partial<Record<Platform, Takedown>>;
  platforms: Platform[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function FilingTimeline({ incident, takedowns, platforms }: Props) {
  const filedList = platforms
    .map((p) => takedowns[p])
    .filter((t): t is Takedown => !!t)
    .sort((a, b) => new Date(a.filed_at).getTime() - new Date(b.filed_at).getTime());

  const allFiled = platforms.length > 0 && platforms.every((p) => !!takedowns[p]);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">What happened</h2>
      <ol className="relative space-y-5 border-l border-white/10 pl-6">
        <li className="relative">
          <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border border-amber-500/40 bg-slate-950 text-amber-300">
            <Radar className="h-3.5 w-3.5" />
          </span>
          <p className="text-sm font-semibold text-amber-300">Leak detected</p>
          <p className="mt-0.5 text-sm text-slate-300">
            {incident.similarity_score}% match on {incident.platform} — "{incident.reasoning}"
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{formatDate(incident.detected_at)}</p>
        </li>

        {filedList.map((t) => (
          <li key={t.id} className="relative">
            <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/40 bg-slate-950 text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm font-semibold text-emerald-300">DMCA notice filed — {t.platform}</p>
            <p className="mt-0.5 text-xs text-slate-500">{formatDate(t.filed_at)}</p>
          </li>
        ))}

        <li className="relative">
          <span
            className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border bg-slate-950 ${
              allFiled ? "border-violet-500/40 text-violet-300" : "border-white/15 text-slate-500"
            }`}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
          <p className={`text-sm font-semibold ${allFiled ? "text-violet-300" : "text-slate-400"}`}>
            {allFiled ? "What's next" : "Next step"}
          </p>
          <p className="mt-0.5 text-sm text-slate-300">
            {allFiled
              ? "Notices are filed on every platform. Platforms typically acknowledge DMCA takedowns within 24–72 hours — status here will move from FILED to IN_REVIEW, then RESOLVED (or FAILED if a platform rejects the notice) as they respond."
              : "Not filed yet. Review the DMCA preview below, then hit Nuke to draft and file takedown notices on all platforms at once."}
          </p>
        </li>
      </ol>
    </div>
  );
}
