import { startOfToday } from "date-fns";

import { CalendarMonth } from "@/components/calendar-month";
import { requireUser } from "@/lib/auth";
import { requireHouseholdContext } from "@/lib/households";

type CalendarPageProps = {
  searchParams: Promise<{ household?: string }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);

  return (
    <section className="space-y-4">
      <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Calendrier</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">Le foyer au fil du mois</h2>
        <p className="mt-3 text-[var(--ink-700)]">
          Sur téléphone, l&apos;agenda des prochaines tâches passe en premier. La grille mensuelle reste disponible dès que l&apos;écran le permet.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            className="btn-secondary px-4 py-2 text-sm"
            href={`/api/calendar/feed.ics?household=${context.household.id}`}
          >
            Export iCal foyer
          </a>
          {context.currentMember ? (
            <a
              className="btn-secondary px-4 py-2 text-sm"
              href={`/api/calendar/member/${context.currentMember.id}/feed.ics?household=${context.household.id}`}
            >
              Export iCal personnel
            </a>
          ) : null}
        </div>
      </div>

      <CalendarMonth month={startOfToday()} occurrences={context.monthOccurrences} />
    </section>
  );
}
