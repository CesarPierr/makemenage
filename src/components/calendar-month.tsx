import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  addDays,
  startOfToday,
} from "date-fns";
import { fr } from "date-fns/locale";

import { hexToRgba } from "@/lib/colors";

type CalendarMonthProps = {
  month: Date;
  mobileDayBase?: Date;
  occurrences: {
    id: string;
    scheduledDate: Date;
    status: string;
    taskTemplate: { title: string; color: string };
    assignedMember: { displayName: string; color: string } | null;
  }[];
  absences: {
    id: string;
    startDate: Date;
    endDate: Date;
    notes: string | null;
    member: { displayName: string; color: string };
  }[];
};

export function CalendarMonth({ month, occurrences, absences, mobileDayBase }: CalendarMonthProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(month.getFullYear(), month.getMonth() + 1, 0), { weekStartsOn: 1 }),
  });

  const mobileWindowStart = mobileDayBase ?? startOfToday();
  const mobileWindowDays = eachDayOfInterval({
    start: mobileWindowStart,
    end: addDays(mobileWindowStart, 3), // 4-day window
  });

  const daysWithOccurrences = mobileWindowDays.map((day) => ({
    day,
    occurrences: occurrences.filter(
      (occurrence) => format(occurrence.scheduledDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
    ),
  }));

  const buildOccurrenceLabel = (occurrence: CalendarMonthProps["occurrences"][number]) =>
    `${occurrence.taskTemplate.title} · ${occurrence.assignedMember?.displayName ?? "À attribuer"}`;
  const dayAbsences = (day: Date) =>
    absences.filter(
      (absence) =>
        format(absence.startDate, "yyyy-MM-dd") <= format(day, "yyyy-MM-dd") &&
        format(absence.endDate, "yyyy-MM-dd") >= format(day, "yyyy-MM-dd"),
    );

  return (
    <>
      <div className="app-surface rounded-[2rem] p-4 md:hidden">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="section-kicker">Agenda mobile</p>
            <h3 className="display-title mt-2 text-2xl">Prochaines tâches</h3>
          </div>
          <span className="stat-pill px-3 py-1 text-xs font-semibold text-[var(--ink-700)]">
            {daysWithOccurrences.length} jours actifs
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {daysWithOccurrences.length ? (
            daysWithOccurrences.map(({ day, occurrences: dayOccurrences }) => {
              const activeAbsences = dayAbsences(day);

              return (
              <article key={day.toISOString()} className="soft-panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-[var(--leaf-600)]">
                      {format(day, "EEEE", { locale: fr })}
                    </p>
                    <h4 className="mt-1 text-lg font-semibold">
                      {format(day, "d MMMM", { locale: fr })}
                    </h4>
                  </div>
                  <span className="stat-pill px-3 py-1 text-xs font-semibold">
                    {dayOccurrences.length} tâche{dayOccurrences.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {activeAbsences.map((absence) => (
                    <div
                      key={absence.id}
                      className="rounded-[1.1rem] border px-3 py-2 text-xs"
                      style={{
                        borderColor: hexToRgba(absence.member.color, 0.22),
                        backgroundColor: hexToRgba(absence.member.color, 0.1),
                        color: "var(--ink-950)",
                      }}
                    >
                      <p className="font-semibold">Absence · {absence.member.displayName}</p>
                      {absence.notes ? <p className="mt-1 text-[11px] text-[var(--ink-700)]">{absence.notes}</p> : null}
                    </div>
                  ))}
                  {dayOccurrences.length ? (
                    dayOccurrences.map((occurrence) => (
                      <div
                        aria-label={buildOccurrenceLabel(occurrence)}
                        key={occurrence.id}
                        className="rounded-[1.1rem] px-3 py-3 text-sm text-white"
                        role="group"
                        style={{ backgroundColor: occurrence.taskTemplate.color ?? "#D8643D" }}
                      >
                        <p className="font-semibold leading-5">{occurrence.taskTemplate.title}</p>
                        <div className="mt-1 inline-flex items-center gap-2 text-xs opacity-90">
                          {occurrence.assignedMember ? (
                            <span
                              className="size-2 rounded-full border border-white/70"
                              style={{ backgroundColor: occurrence.assignedMember.color }}
                            />
                          ) : null}
                          <span>{occurrence.assignedMember?.displayName ?? "À attribuer"}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    !activeAbsences.length ? (
                      <p className="py-2 text-center text-xs italic text-[var(--ink-500)]">Aucune tâche</p>
                    ) : null
                  )}
                </div>
              </article>
            );
            })
          ) : (
            <div className="soft-panel p-4 text-sm leading-6 text-[var(--ink-700)]">
              Aucune occurrence n&apos;est encore prévue pour ce mois.
            </div>
          )}
        </div>
      </div>

      <div className="app-surface hidden overflow-hidden rounded-[2rem] md:block">
        <div className="grid grid-cols-7 border-b border-[var(--line)] bg-white/50">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div
              key={day}
              className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-700)]"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayOccurrences = occurrences.filter(
              (occurrence) => format(occurrence.scheduledDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
            );
            const activeAbsences = dayAbsences(day);

            return (
              <div
                key={day.toISOString()}
                className="calendar-cell border-b border-r border-[var(--line)] px-2 py-2 align-top last:border-r-0"
              >
                <div className={isSameMonth(day, month) ? "" : "opacity-40"}>
                  <p className="mb-2 text-sm font-semibold text-[var(--ink-700)]">
                    {format(day, "d", { locale: fr })}
                  </p>
                  <div className="space-y-1.5">
                    {activeAbsences.map((absence) => (
                      <div
                        key={absence.id}
                        className="rounded-xl px-2 py-1 text-xs leading-5"
                        style={{
                          backgroundColor: hexToRgba(absence.member.color, 0.08),
                          color: "var(--ink-950)",
                          border: `1px solid ${hexToRgba(absence.member.color, 0.18)}`,
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ backgroundColor: absence.member.color }} />
                          <p className="truncate font-semibold">Absence · {absence.member.displayName}</p>
                        </div>
                      </div>
                    ))}
                    {dayOccurrences.slice(0, 3).map((occurrence) => (
                      <div
                        aria-label={buildOccurrenceLabel(occurrence)}
                        key={occurrence.id}
                        className="rounded-xl px-2 py-1 text-xs leading-5"
                        role="group"
                        style={{
                          backgroundColor: hexToRgba(occurrence.taskTemplate.color ?? "#D8643D", 0.14),
                          color: "var(--ink-950)",
                          border: `1px solid ${hexToRgba(occurrence.taskTemplate.color ?? "#D8643D", 0.22)}`,
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: occurrence.taskTemplate.color ?? "#D8643D" }}
                          />
                          <p className="truncate font-semibold">{occurrence.taskTemplate.title}</p>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--ink-700)]">
                          {occurrence.assignedMember ? (
                            <span
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: occurrence.assignedMember.color }}
                            />
                          ) : null}
                          <p className="truncate">
                            {occurrence.assignedMember?.displayName ?? "À attribuer"}
                          </p>
                        </div>
                      </div>
                    ))}
                    {dayOccurrences.length > 3 ? (
                      <p className="text-xs text-[var(--ink-700)]">+{dayOccurrences.length - 3} autres</p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
