import { OccurrenceCard } from "@/components/occurrence-card";
import { requireUser } from "@/lib/auth";
import { requireHouseholdContext } from "@/lib/households";

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

  return (
    <section className="space-y-4">
      <div className="app-surface rounded-[2rem] p-5 sm:p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--leaf-600)]">Mes tâches</p>
        <h2 className="display-title mt-2 text-4xl">Tout ce qui m’est attribué</h2>
        <p className="mt-3 text-[var(--ink-700)]">
          Cette vue met en avant les occurrences qui vous concernent, avec les actions rapides juste en dessous.
        </p>
      </div>

      {myOccurrences.length ? (
        myOccurrences.map((occurrence) => (
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
  );
}
