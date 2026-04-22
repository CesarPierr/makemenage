import { addDays, addMonths, format, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";

import { CalendarMonth } from "@/components/calendar-month";
import { requireUser } from "@/lib/auth";
import { buildCalendarOverview } from "@/lib/experience";
import { requireHouseholdContext } from "@/lib/households";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { CalendarSidebar } from "@/components/calendar-sidebar";

type CalendarPageProps = {
  searchParams: Promise<{ 
    household?: string;
    monthOffset?: string;
    dayOffset?: string;
  }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const monthOffset = parseInt(params.monthOffset ?? "0", 10);
  const dayOffset = parseInt(params.dayOffset ?? "0", 10);
  const today = startOfToday();
  const currentMonth = addMonths(today, monthOffset);
  const currentDayBase = addDays(today, dayOffset);
  
  const context = await requireHouseholdContext(user.id, params.household, {
    monthDate: currentMonth,
    monthSpan: 1,
  });
  
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const householdFeedUrl = `${baseUrl}/api/calendar/feed.ics?household=${context.household.id}`;
  const personalFeedUrl = context.currentMember
    ? `${baseUrl}/api/calendar/member/${context.currentMember.id}/feed.ics?household=${context.household.id}`
    : null;
  const absences = context.household.members.flatMap((member) =>
    member.availabilities
      .filter((availability) => availability.type === "date_range_absence")
      .map((availability) => ({
        id: availability.id,
        startDate: availability.startDate,
        endDate: availability.endDate,
        notes: availability.notes,
        member: {
          displayName: member.displayName,
          color: member.color,
        },
      })),
  );
  const overview = buildCalendarOverview(context.monthOccurrences, absences);

  const prevMonthHref = `/app/calendar?household=${context.household.id}&monthOffset=${monthOffset - 1}&dayOffset=0`;
  const nextMonthHref = `/app/calendar?household=${context.household.id}&monthOffset=${monthOffset + 1}&dayOffset=0`;
  const todayHref = `/app/calendar?household=${context.household.id}&monthOffset=0&dayOffset=0`;
  
  const prevDaysHref = `/app/calendar?household=${context.household.id}&monthOffset=${monthOffset}&dayOffset=${dayOffset - 4}`;
  const nextDaysHref = `/app/calendar?household=${context.household.id}&monthOffset=${monthOffset}&dayOffset=${dayOffset + 4}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <section className="space-y-6">
        <div className="app-surface glow-card rounded-[2rem] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="section-kicker">Calendrier</p>
              <h2 className="display-title mt-2 truncate text-3xl leading-tight sm:text-4xl">
                {format(currentMonth, "MMMM yyyy", { locale: fr })}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-700)]">
                Vue mensuelle pour regrouper les tâches, repérer les jours chargés et visualiser les absences sans perdre l’essentiel.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Desktop Month Nav */}
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href={prevMonthHref}
                  className="btn-secondary flex size-11 items-center justify-center rounded-full p-0"
                  title="Mois précédent"
                >
                  <ChevronLeft className="size-5" />
                </Link>
                <Link href={todayHref} className="btn-secondary px-4 py-2 text-sm font-bold">
                  Aujourd&apos;hui
                </Link>
                <Link
                  href={nextMonthHref}
                  className="btn-secondary flex size-11 items-center justify-center rounded-full p-0"
                  title="Mois suivant"
                >
                  <ChevronRight className="size-5" />
                </Link>
              </div>

              {/* Mobile Day Nav (Windowed) */}
              <div className="flex w-full items-center justify-between gap-2 sm:hidden">
                <Link
                  href={prevDaysHref}
                  className="btn-secondary flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold"
                >
                  <ChevronLeft className="size-4" />
                  Précédent
                </Link>
                <Link href={todayHref} className="btn-secondary px-4 py-3 text-xs font-bold">
                  Auj.
                </Link>
                <Link
                  href={nextDaysHref}
                  className="btn-secondary flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold"
                >
                  Suivant
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 summary-strip sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Occurrences",
                value: overview.taskCount,
                detail: "sur le mois affiché",
              },
              {
                label: "Jours actifs",
                value: overview.busyDays,
                detail: "avec au moins une tâche",
              },
              {
                label: "Absences",
                value: overview.absenceCount,
                detail: `${overview.absenceDays} jour${overview.absenceDays > 1 ? "s" : ""} couverts`,
              },
              {
                label: "Vue mobile",
                value: 4,
                detail: "jours visibles à la fois",
              },
            ].map((item) => (
              <article key={item.label} className="metric-card interactive-surface px-4 py-4">
                <p className="text-sm text-[var(--ink-700)]">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold">{item.value}</p>
                <p className="text-sm text-[var(--ink-500)]">{item.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="accent-pill">
              <span className="accent-pill-dot" style={{ backgroundColor: "var(--coral-500)" }} />
              Tâche du planning
            </span>
            <span className="accent-pill">
              <span className="accent-pill-dot" style={{ backgroundColor: "var(--sky-500)" }} />
              Jour affiché
            </span>
            <span className="accent-pill">
              <span className="accent-pill-dot" style={{ backgroundColor: "var(--leaf-500)" }} />
              Absence
            </span>
          </div>
        </div>

        <div className="deferred-section animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CalendarMonth 
            month={currentMonth} 
            occurrences={context.monthOccurrences}
            absences={absences}
            mobileDayBase={currentDayBase}
          />
        </div>
      </section>

      <CalendarSidebar
        householdFeedUrl={householdFeedUrl}
        personalFeedUrl={personalFeedUrl}
        householdId={context.household.id}
      />
    </div>
  );
}
