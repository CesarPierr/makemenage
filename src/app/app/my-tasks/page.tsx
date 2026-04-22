import { OccurrenceCard } from "@/components/occurrence-card";
import { TaskCreationWizard } from "@/components/task-creation-wizard";
import { TaskSettingsList } from "@/components/task-settings-list";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageHousehold, requireHouseholdContext } from "@/lib/households";

type MyTasksPageProps = {
  searchParams: Promise<{ household?: string }>;
};

export default async function MyTasksPage({ searchParams }: MyTasksPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);
  const manageable = canManageHousehold(context.membership.role);

  const myOccurrences = context.currentMember
    ? context.occurrences.filter((occurrence) => occurrence.assignedMemberId === context.currentMember?.id)
    : [];
  const upcomingAssigned = myOccurrences.filter((occurrence) =>
    ["planned", "due", "overdue", "rescheduled"].includes(occurrence.status),
  );
  const closedAssigned = myOccurrences.filter((occurrence) =>
    ["completed", "skipped", "cancelled"].includes(occurrence.status),
  );
  const manualFutureOverrides =
    manageable && context.tasks.length
      ? await db.taskOccurrence.findMany({
          where: {
            householdId: context.household.id,
            taskTemplateId: {
              in: context.tasks.map((task) => task.id),
            },
            status: {
              in: ["planned", "due", "overdue", "rescheduled"],
            },
            scheduledDate: {
              gte: new Date(),
            },
            isManuallyModified: true,
          },
          select: {
            taskTemplateId: true,
          },
        })
      : [];
  const manualOverridesByTaskId = manualFutureOverrides.reduce<Record<string, number>>((acc, occurrence) => {
    acc[occurrence.taskTemplateId] = (acc[occurrence.taskTemplateId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="space-y-4">
      <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Tâches</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">
          {manageable ? "Actions du jour et tâches récurrentes" : "Mes tâches du foyer"}
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">À traiter</p>
            <p className="mt-1 text-2xl font-semibold">{upcomingAssigned.length}</p>
          </div>
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Clôturées</p>
            <p className="mt-1 text-2xl font-semibold">{closedAssigned.length}</p>
          </div>
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">{manageable ? "Récurrences" : "Total"}</p>
            <p className="mt-1 text-2xl font-semibold">{manageable ? context.tasks.length : myOccurrences.length}</p>
          </div>
        </div>
        <div className="section-nav mt-5">
          <a className="section-nav-link" href="#my-occurrences">À faire</a>
          {manageable ? <a className="section-nav-link" href="#new-task">Nouvelle tâche</a> : null}
          {manageable ? <a className="section-nav-link" href="#administration">Récurrences</a> : null}
          {closedAssigned.length ? <a className="section-nav-link" href="#archives">Archives</a> : null}
        </div>
      </div>

      {manageable ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]" id="new-task">
          <TaskCreationWizard
            householdId={context.household.id}
            members={context.household.members.map((member) => ({
              id: member.id,
              displayName: member.displayName,
              color: member.color,
            }))}
          />
          <aside className="app-surface rounded-[2rem] p-5 sm:p-6">
            <p className="section-kicker">Administration</p>
            <h3 className="display-title mt-2 text-3xl">Catalogue des tâches</h3>
            <div className="mt-5 space-y-3">
              <div className="soft-panel px-4 py-3">
                <p className="text-sm text-[var(--ink-700)]">Modèles actifs</p>
                <p className="mt-1 text-2xl font-semibold">{context.tasks.length}</p>
              </div>
              <div className="soft-panel px-4 py-3">
                <p className="text-sm text-[var(--ink-700)]">Futures modifications manuelles</p>
                <p className="mt-1 text-2xl font-semibold">{manualFutureOverrides.length}</p>
              </div>
            </div>
          </aside>
        </section>
      ) : null}

      <section className="space-y-3" id="my-occurrences">
        <div className="flex items-center justify-between px-1">
          <h3 className="display-title text-2xl">À faire</h3>
          <span className="stat-pill px-3 py-1 text-xs font-semibold text-[var(--ink-700)]">
            {upcomingAssigned.length} occurrence{upcomingAssigned.length > 1 ? "s" : ""}
          </span>
        </div>
        {upcomingAssigned.length ? (
          upcomingAssigned.map((occurrence) => (
            <OccurrenceCard
              key={occurrence.id}
              occurrence={occurrence}
              members={context.household.members}
              currentMemberId={context.currentMember?.id}
            />
          ))
        ) : (
          <div className="app-surface rounded-[2rem] p-5 text-[var(--ink-700)]">
            Aucun élément ne vous est attribué pour le moment.
          </div>
        )}
      </section>

      {manageable ? (
        <section className="app-surface rounded-[2rem] p-5 sm:p-6" id="administration">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Récurrences</p>
              <h3 className="display-title mt-2 text-3xl">Gérer les tâches du foyer</h3>
            </div>
            <span className="stat-pill px-3 py-1 text-sm">{context.tasks.length} actives</span>
          </div>
          <TaskSettingsList
            tasks={context.tasks}
            householdId={context.household.id}
            manualOverridesByTaskId={manualOverridesByTaskId}
          />
        </section>
      ) : null}

      {closedAssigned.length ? (
        <details className="app-surface rounded-[2rem] p-5" id="archives">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--ink-950)]">
            Voir les tâches déjà closes ({closedAssigned.length})
          </summary>
          <div className="mt-4 space-y-4">
            {closedAssigned.map((occurrence) => (
              <OccurrenceCard
                key={occurrence.id}
                occurrence={occurrence}
                members={context.household.members}
                currentMemberId={context.currentMember?.id}
              />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
