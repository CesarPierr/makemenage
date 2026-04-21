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
      <div className="app-surface rounded-[2rem] p-5 sm:p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--leaf-600)]">Calendrier</p>
        <h2 className="display-title mt-2 text-4xl">Le foyer au fil du mois</h2>
        <p className="mt-3 text-[var(--ink-700)]">
          Visualisez les occurrences futures, par membre et par rythme. Un flux iCal est aussi disponible.
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
