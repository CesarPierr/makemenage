import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, CheckCircle2, RotateCcw, SkipForward } from "lucide-react";

import { CollapsibleList } from "@/components/collapsible-list";
import { requireUser } from "@/lib/auth";
import { getHistoryActionDescription, getHistoryActionLabel } from "@/lib/history";
import { requireHouseholdContext } from "@/lib/households";

type HistoryPageProps = {
  searchParams: Promise<{ household?: string }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);
  const visibleLogs = context.actionLogs.filter((log) => log.actionType !== "created");
  const completedCount = visibleLogs.filter((log) => log.actionType === "completed").length;
  const skippedCount = visibleLogs.filter((log) => log.actionType === "skipped").length;
  const movedCount = visibleLogs.filter((log) => log.actionType === "rescheduled").length;

  function getActionTone(actionType: string) {
    if (actionType === "completed") {
      return {
        icon: CheckCircle2,
        accent: "var(--leaf-600)",
        surface: "rgba(56, 115, 93, 0.1)",
      };
    }

    if (actionType === "skipped") {
      return {
        icon: SkipForward,
        accent: "var(--ink-950)",
        surface: "rgba(30, 31, 34, 0.06)",
      };
    }

    if (actionType === "rescheduled") {
      return {
        icon: RotateCcw,
        accent: "var(--sky-600)",
        surface: "rgba(47, 109, 136, 0.1)",
      };
    }

    return {
      icon: ArrowRight,
      accent: "var(--coral-600)",
      surface: "rgba(216, 100, 61, 0.1)",
    };
  }

  return (
    <section className="space-y-4">
      <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Historique</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">Les dernières actions utiles</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Terminées</p>
            <p className="mt-1 text-2xl font-semibold">{completedCount}</p>
          </div>
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Sautées</p>
            <p className="mt-1 text-2xl font-semibold">{skippedCount}</p>
          </div>
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Reportées</p>
            <p className="mt-1 text-2xl font-semibold">{movedCount}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <CollapsibleList
          initialCount={5}
          label="Voir l'historique complet"
          items={visibleLogs.map((log) => {
            const actionLabel = getHistoryActionLabel(log.actionType);
            const actionDescription = getHistoryActionDescription(log);
            const tone = getActionTone(log.actionType);
            const Icon = tone.icon;

            return (
              <article key={log.id} className="app-surface flex items-center gap-4 rounded-[1.3rem] p-3 transition-all hover:bg-white/50">
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-full shadow-sm"
                  style={{ backgroundColor: tone.surface, color: tone.accent, border: `1px solid ${tone.accent}20` }}
                >
                  <Icon className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-semibold text-[var(--ink-950)]">{log.occurrence.taskTemplate.title}</h3>
                    <span className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--ink-500)]">
                      {format(log.createdAt, "HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <p className="truncate text-xs text-[var(--ink-700)]">
                    <span className="font-bold" style={{ color: tone.accent }}>{actionLabel}</span> · {actionDescription}
                  </p>
                </div>
                <div className="hidden shrink-0 sm:block">
                  <span className="rounded-full bg-[var(--line)] px-2.5 py-1 text-[0.65rem] font-bold text-[var(--ink-700)]">
                    {log.actorMember?.displayName ?? "Système"}
                  </span>
                </div>
              </article>
            );
          })}
        />
        {!visibleLogs.length && (
          <div className="app-surface rounded-[1.8rem] p-5 text-sm leading-6 text-[var(--ink-700)]">
            Rien de marquant pour l’instant. Les changements manuels apparaîtront ici dès qu’une tâche sera validée, sautée, reportée ou réattribuée.
          </div>
        )}
      </div>
    </section>
  );
}
