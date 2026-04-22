import { TaskCreationWizard } from "@/components/task-creation-wizard";
import { OccurrenceCard } from "@/components/occurrence-card";
import { requireUser } from "@/lib/auth";
import { canManageHousehold, requireHouseholdContext } from "@/lib/households";

type MyTasksPageProps = {
  searchParams: Promise<{ household?: string }>;
};

export default async function MyTasksPage({ searchParams }: MyTasksPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);

  const myOccurrences = context.currentMember
    ? context.occurrences.filter((occurrence) => occurrence.assignedMemberId === context.currentMember?.id)
    : [];
  const upcomingAssigned = myOccurrences.filter((occurrence) =>
    ["planned", "due", "overdue", "rescheduled"].includes(occurrence.status),
  );
  const closedAssigned = myOccurrences.filter((occurrence) =>
    ["completed", "skipped", "cancelled"].includes(occurrence.status),
  );

  return (
    <section className="space-y-4">
      <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Tâches</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">Mes actions et les nouvelles tâches</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">À traiter</p>
            <p className="mt-1 text-2xl font-semibold">{upcomingAssigned.length}</p>
          </div>
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Closes</p>
            <p className="mt-1 text-2xl font-semibold">{closedAssigned.length}</p>
          </div>
          <div className="soft-panel px-4 py-3">
            <p className="text-sm text-[var(--ink-700)]">Total</p>
            <p className="mt-1 text-2xl font-semibold">{myOccurrences.length}</p>
          </div>
        </div>
      </div>

      {canManageHousehold(context.membership.role) ? (
        <TaskCreationWizard
          householdId={context.household.id}
          members={context.household.members.map((member) => ({
            id: member.id,
            displayName: member.displayName,
            color: member.color,
          }))}
        />
      ) : null}

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

      {closedAssigned.length ? (
        <details className="app-surface rounded-[2rem] p-5">
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
