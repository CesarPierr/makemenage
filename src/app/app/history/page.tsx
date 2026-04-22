import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, CheckCircle2, RotateCcw, SkipForward } from "lucide-react";

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
  const latestLogs = visibleLogs.slice(0, 5);
  const olderLogs = visibleLogs.slice(5);
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

      <div className="space-y-3">
        {visibleLogs.length ? (
          latestLogs.map((log) => {
            const actionLabel = getHistoryActionLabel(log.actionType);
            const actionDescription = getHistoryActionDescription(log);
            const tone = getActionTone(log.actionType);
            const Icon = tone.icon;

            return (
              <article key={log.id} className="app-surface rounded-[1.7rem] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]"
                      style={{ backgroundColor: tone.surface, color: tone.accent }}
                    >
                      <Icon className="size-3.5" />
                      {actionLabel}
                    </div>
                    <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-700)]">
                      {format(log.createdAt, "EEE d MMM, HH:mm", { locale: fr })}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{log.occurrence.taskTemplate.title}</h3>
                    <p className="mt-1 text-sm text-[var(--ink-700)]">{actionDescription}</p>
                  </div>
                  <span className="stat-pill px-3 py-1 text-xs">{log.actorMember?.displayName ?? "Système"}</span>
                </div>
              </article>
            );
          })
        ) : (
          <div className="app-surface rounded-[1.8rem] p-5 text-sm leading-6 text-[var(--ink-700)]">
            Rien de marquant pour l’instant. Les changements manuels apparaîtront ici dès qu’une tâche sera validée, sautée, reportée ou réattribuée.
          </div>
        )}
        {olderLogs.length ? (
          <details className="app-surface rounded-[1.8rem] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--sky-600)]">
              Afficher plus ({olderLogs.length})
            </summary>
            <div className="mt-4 space-y-3">
              {olderLogs.map((log) => {
                const actionLabel = getHistoryActionLabel(log.actionType);
                const actionDescription = getHistoryActionDescription(log);

                return (
                  <article key={log.id} className="soft-panel p-4">
                    <p className="text-sm uppercase tracking-[0.18em] text-[var(--ink-700)]">
                      {format(log.createdAt, "EEE d MMM, HH:mm", { locale: fr })}
                    </p>
                    <h3 className="mt-1 text-base font-semibold">
                      {log.occurrence.taskTemplate.title} · {actionLabel}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--ink-700)]">{actionDescription}</p>
                  </article>
                );
              })}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
