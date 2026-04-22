import { addMonths, format, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";

import { CalendarSyncPanel } from "@/components/calendar-sync-panel";
import { CalendarMonth } from "@/components/calendar-month";
import { requireUser } from "@/lib/auth";
import { requireHouseholdContext } from "@/lib/households";

type CalendarPageProps = {
  searchParams: Promise<{ household?: string }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const today = startOfToday();
  const context = await requireHouseholdContext(user.id, params.household, {
    monthDate: today,
    monthSpan: 3,
  });
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const householdFeedUrl = `${baseUrl}/api/calendar/feed.ics?household=${context.household.id}`;
  const personalFeedUrl = context.currentMember
    ? `${baseUrl}/api/calendar/member/${context.currentMember.id}/feed.ics?household=${context.household.id}`
    : null;
  const months = Array.from({ length: 3 }, (_, index) => addMonths(today, index));

  return (
    <section className="space-y-4">
      <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
        <p className="section-kicker">Calendrier</p>
        <h2 className="display-title mt-2 text-4xl leading-tight">Le foyer au fil du mois</h2>
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

      <CalendarSyncPanel
        householdFeedUrl={householdFeedUrl}
        personalFeedUrl={personalFeedUrl}
      />

      <div className="space-y-4">
        {months.map((month, index) => (
          <section key={month.toISOString()} className="space-y-3">
            {(() => {
              const monthCount = context.monthOccurrences.filter(
                (occurrence) =>
                  format(occurrence.scheduledDate, "yyyy-MM") === format(month, "yyyy-MM"),
              ).length;

              return (
            <div className="flex items-end justify-between gap-3 px-1">
              <div>
                <p className="section-kicker">
                  {index === 0 ? "Ce mois-ci" : index === 1 ? "Le mois prochain" : "Dans deux mois"}
                </p>
                <h3 className="display-title mt-2 text-3xl">
                  {format(month, "MMMM yyyy", { locale: fr })}
                </h3>
              </div>
              <span className="stat-pill px-3 py-1 text-xs font-semibold text-[var(--ink-700)]">
                {monthCount} occurrence{monthCount > 1 ? "s" : ""}
              </span>
            </div>
              );
            })()}
            <CalendarMonth month={month} occurrences={context.monthOccurrences} />
          </section>
        ))}
      </div>
    </section>
  );
}
