import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

  return (
    <section className="space-y-4">
      <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Historique</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">Ce qui a changé récemment</h2>
        <p className="mt-3 text-[var(--ink-700)]">
          Cette vue met surtout en avant les actions manuelles du foyer: complétion, saut, report ou réassignation.
        </p>
      </div>

      <div className="space-y-3">
        {visibleLogs.length ? (
          visibleLogs.map((log) => {
            const actionLabel = getHistoryActionLabel(log.actionType);
            const actionDescription = getHistoryActionDescription(log);

            return (
              <article key={log.id} className="app-surface rounded-[1.7rem] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-[var(--leaf-600)]">
                      {format(log.createdAt, "EEE d MMM, HH:mm", { locale: fr })}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {log.occurrence.taskTemplate.title} · {actionLabel}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--ink-700)]">{actionDescription}</p>
                  </div>
                  <span className="stat-pill px-3 py-1 text-xs">{actionLabel}</span>
                </div>
              </article>
            );
          })
        ) : (
          <div className="app-surface rounded-[1.8rem] p-5 text-sm leading-6 text-[var(--ink-700)]">
            Rien de marquant pour l’instant. Les changements manuels apparaîtront ici dès qu’une tâche sera validée, sautée, reportée ou réattribuée.
          </div>
        )}
      </div>
    </section>
  );
}
