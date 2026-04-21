import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { requireUser } from "@/lib/auth";
import { requireHouseholdContext } from "@/lib/households";

type HistoryPageProps = {
  searchParams: Promise<{ household?: string }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);

  return (
    <section className="space-y-4">
      <div className="app-surface rounded-[2rem] p-5 sm:p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--leaf-600)]">Historique</p>
        <h2 className="display-title mt-2 text-4xl">Ce qui a changé récemment</h2>
        <p className="mt-3 text-[var(--ink-700)]">
          Chaque action importante laisse une trace: création, complétion, saut, report ou réassignation.
        </p>
      </div>

      <div className="space-y-3">
        {context.actionLogs.map((log) => (
          <article key={log.id} className="app-surface rounded-[1.7rem] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--leaf-600)]">
                  {format(log.createdAt, "EEE d MMM, HH:mm", { locale: fr })}
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {log.occurrence.taskTemplate.title} · {log.actionType}
                </h3>
                <p className="mt-1 text-sm text-[var(--ink-700)]">
                  Par {log.actorMember?.displayName ?? "système"}
                </p>
              </div>
              <span className="stat-pill px-3 py-1 text-xs capitalize">{log.actionType}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
