import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, SkipForward, RotateCcw, Pencil, ArrowRight } from "lucide-react";

import { ReopenButton } from "@/components/reopen-button";
import { formatRelative } from "@/lib/relative-date";

type ActivityLog = {
  id: string;
  actionType: string;
  createdAt: Date;
  newValues: unknown;
  actorMember: { displayName: string; color: string | null } | null;
  occurrence: {
    id: string;
    taskTemplate: { title: string; color: string | null };
  };
};

function getVerbAndIcon(actionType: string) {
  switch (actionType) {
    case "completed":
      return { verb: "a validé", icon: CheckCircle2, accent: "var(--leaf-600)" };
    case "skipped":
      return { verb: "a passé", icon: SkipForward, accent: "var(--ink-500)" };
    case "rescheduled":
      return { verb: "a reporté", icon: RotateCcw, accent: "var(--sky-600)" };
    case "edited":
      return { verb: "a modifié", icon: Pencil, accent: "var(--coral-600)" };
    case "reassigned":
      return { verb: "a réattribué", icon: ArrowRight, accent: "var(--coral-600)" };
    default:
      return { verb: "a mis à jour", icon: ArrowRight, accent: "var(--ink-500)" };
  }
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getTimeSuffix(log: ActivityLog): string {
  const values = readObject(log.newValues);
  if (log.actionType === "rescheduled" && typeof values.scheduledDate === "string") {
    return `à ${formatRelative(values.scheduledDate)}`;
  }
  return formatDistanceToNow(log.createdAt, { locale: fr, addSuffix: true });
}

type RecentActivityFeedProps = {
  logs: ActivityLog[];
  householdId: string;
  currentMemberId?: string;
};

export function RecentActivityFeed({ logs, householdId, currentMemberId }: RecentActivityFeedProps) {
  const visible = logs.filter((l) => l.actionType !== "created").slice(0, 6);

  if (visible.length === 0) return null;

  return (
    <section className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-kicker">Activité</p>
          <h2 className="display-title mt-1 text-2xl leading-tight">Ce qui vient de bouger</h2>
        </div>
        <Link
          href={`/app/settings/activity?household=${householdId}`}
          className="shrink-0 text-xs font-semibold text-[var(--coral-600)] hover:underline"
        >
          Tout voir →
        </Link>
      </div>

      <ul className="mt-4 space-y-1" aria-label="Activité récente">
        {visible.map((log) => {
          const { verb, icon: Icon, accent } = getVerbAndIcon(log.actionType);
          const actor = log.actorMember?.displayName ?? "Le système";
          const taskTitle = log.occurrence.taskTemplate.title;
          const timeSuffix = getTimeSuffix(log);

          return (
            <li
              key={log.id}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all hover:bg-black/[0.03]"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${accent}18`, color: accent }}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              <p className="min-w-0 flex-1 text-sm leading-5">
                <strong className="font-semibold text-[var(--ink-950)]">{actor}</strong>
                {" "}{verb}{" "}
                <em className="not-italic font-semibold text-[var(--ink-950)]">{taskTitle}</em>
                {" "}
                <span className="text-[var(--ink-500)] text-xs">{timeSuffix}</span>
              </p>
              {(log.actionType === "completed" || log.actionType === "skipped") && currentMemberId ? (
                <ReopenButton
                  occurrenceId={log.occurrence.id}
                  memberId={currentMemberId}
                  compact
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
