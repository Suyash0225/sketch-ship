import type { Incident, Takedown } from "../lib/api";
import { formatDate } from "../lib/format";

interface Props {
  incident: Incident;
  takedowns: Partial<Record<string, Takedown>>;
  platforms: string[];
}

function Entry({
  no,
  tone,
  title,
  when,
  children,
}: {
  no: string;
  tone: "crimson" | "verdant" | "ink" | "faint";
  title: string;
  when?: string;
  children?: React.ReactNode;
}) {
  const toneClass = {
    crimson: "text-crimson",
    verdant: "text-verdant",
    ink: "text-ink",
    faint: "text-ink-faint",
  }[tone];
  return (
    <li className="flex gap-4 border-b border-dashed border-line py-3 last:border-b-0">
      <span className={`font-display text-lg font-semibold tabular-nums ${toneClass}`}>{no}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className={`text-xs font-bold uppercase tracking-[0.14em] ${toneClass}`}>{title}</p>
          {when && <p className="text-[11px] tabular-nums text-ink-faint">{when}</p>}
        </div>
        {children && <p className="mt-1 text-xs leading-relaxed text-ink-soft">{children}</p>}
      </div>
    </li>
  );
}

export default function FilingTimeline({ incident, takedowns, platforms }: Props) {
  const filedList = platforms
    .map((p) => takedowns[p])
    .filter((t): t is Takedown => !!t)
    .sort((a, b) => new Date(a.filed_at).getTime() - new Date(b.filed_at).getTime());

  const allFiled = platforms.length > 0 && platforms.every((p) => !!takedowns[p]);
  let n = 0;
  const num = () => String(++n).padStart(2, "0");

  return (
    <div className="border border-line bg-card p-5">
      <h2 className="mb-1 font-display text-xl text-ink">Docket entries</h2>
      <ol>
        <Entry no={num()} tone="crimson" title="Leak detected" when={formatDate(incident.detected_at)}>
          {incident.similarity_score}% match on {incident.platform} — “{incident.reasoning}”
        </Entry>

        {filedList.map((t) => (
          <Entry
            key={t.id}
            no={num()}
            tone="verdant"
            title={`DMCA notice filed — ${t.platform}`}
            when={formatDate(t.filed_at)}
          />
        ))}

        <Entry no={num()} tone={allFiled ? "ink" : "faint"} title={allFiled ? "What's next" : "Next step"}>
          {allFiled
            ? "Notices are filed on every platform. Platforms typically acknowledge DMCA takedowns within 24–72 hours — status here will move from FILED to IN_REVIEW, then RESOLVED (or FAILED if a platform rejects the notice) as they respond."
            : "Not filed yet. Review the DMCA notice below, then file it on all platforms at once."}
        </Entry>
      </ol>
    </div>
  );
}
