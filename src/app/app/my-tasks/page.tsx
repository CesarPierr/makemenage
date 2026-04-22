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
      <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Mes tâches</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">Tout ce qui m’est attribué</h2>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[rgba(56,115,93,0.1)] px-3 py-2 text-sm text-[var(--leaf-600)]">
          {myOccurrences.length} tâche{myOccurrences.length > 1 ? "s" : ""} pour moi
        </div>
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
