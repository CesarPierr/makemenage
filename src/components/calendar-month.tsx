"use client";

import {
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
  addDays,
  startOfToday,
} from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { Clock, ListTodo } from "lucide-react";

import { hexToRgba } from "@/lib/colors";

type CalendarMonthProps = {
  month: Date;
  mobileDayBase?: Date;
  occurrences: {
    id: string;
    scheduledDate: Date;
    status: string;
    taskTemplate: { title: string; color: string; estimatedMinutes: number };
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
  const [viewType, setViewType] = useState<"tasks" | "minutes">("tasks");
  const gridDays = eachDayOfInterval({
    start: startOfWeek(month, { weekStartsOn: 1 }),
    end: endOfWeek(addDays(month, 30), { weekStartsOn: 1 }),
  });

  const minutesDays = eachDayOfInterval({
    start: month,
    end: addDays(month, 14), // Show up to 15 days in the minutes bar chart
  });

  const mobileWindowStart = mobileDayBase ?? startOfToday();
  const mobileWindowDays = eachDayOfInterval({
    start: mobileWindowStart,
    end: addDays(mobileWindowStart, 6), // 7-day sliding window on mobile
  });

  const daysWithOccurrences = mobileWindowDays.map((day) => ({
    day,
    occurrences: occurrences.filter(
      (occurrence) => format(occurrence.scheduledDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
    ),
  }));

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
            <h3 className="display-title mt-2 text-2xl">
              {viewType === "tasks" ? "Les 7 prochains jours" : "Charge prévue"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-700)]">
              Une vue compacte, lisible et sans scroll horizontal.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-[1.5rem] border border-[var(--line)] bg-white/60 p-1.5">
          <button
            aria-pressed={viewType === "tasks"}
            className={`rounded-[1.1rem] px-3 py-2.5 text-sm font-semibold transition-all ${
              viewType === "tasks"
                ? "bg-[var(--ink-950)] text-white shadow-sm"
                : "text-[var(--ink-700)]"
            }`}
            onClick={() => setViewType("tasks")}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <ListTodo className="size-4" />
              Vue tâches
            </span>
          </button>
          <button
            aria-pressed={viewType === "minutes"}
            className={`rounded-[1.1rem] px-3 py-2.5 text-sm font-semibold transition-all ${
              viewType === "minutes"
                ? "bg-[var(--ink-950)] text-white shadow-sm"
                : "text-[var(--ink-700)]"
            }`}
            onClick={() => setViewType("minutes")}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4" />
              Vue minutes
            </span>
          </button>
        </div>

        {viewType === "minutes" ? (
          <div
            aria-label="Charge prévue sur 7 jours"
            className="mt-4 rounded-[1.6rem] border border-[var(--line)] bg-white/70 p-4"
            role="region"
          >
            <div className="grid h-48 grid-cols-7 items-end gap-2">
              {minutesDays.slice(0, 7).map((day) => {
                const isToday = format(day, "yyyy-MM-dd") === format(startOfToday(), "yyyy-MM-dd");
                const dayOccurrences = occurrences.filter(
                  (occurrence) => format(occurrence.scheduledDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
                );
                const totalMinutes = dayOccurrences.reduce(
                  (sum, occurrence) => sum + occurrence.taskTemplate.estimatedMinutes,
                  0,
                );
                const maxVisibleMinutes = Math.max(
                  45,
                  ...minutesDays
                    .slice(0, 7)
                    .map((chartDay) =>
                      occurrences
                        .filter((occurrence) => format(occurrence.scheduledDate, "yyyy-MM-dd") === format(chartDay, "yyyy-MM-dd"))
                        .reduce((sum, occurrence) => sum + occurrence.taskTemplate.estimatedMinutes, 0),
                    ),
                );
                const heightPercent = Math.min(100, (totalMinutes / maxVisibleMinutes) * 100);

                return (
                  <div key={day.toISOString()} className="flex h-full flex-col items-center justify-end gap-2">
                    <div className="h-5 text-center text-[0.62rem] font-bold text-[var(--ink-500)]">
                      {totalMinutes ? `${totalMinutes}` : ""}
                    </div>
                    <div className="flex h-28 w-full items-end justify-center rounded-full bg-[var(--ink-100)]/60 px-1 py-1">
                      <div
                        className={`w-full rounded-full transition-all duration-500 ${
                          isToday ? "bg-[var(--coral-500)]" : "bg-[var(--sky-500)]"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-500)]">
                        {format(day, "EEE", { locale: fr }).slice(0, 3)}
                      </p>
                      <p className={`text-sm font-bold ${isToday ? "text-[var(--coral-600)]" : "text-[var(--ink-950)]"}`}>
                        {format(day, "d")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div aria-label="Tâches des 7 prochains jours" className="mt-4 space-y-3" role="region">
            {daysWithOccurrences.length ? (
              daysWithOccurrences.map(({ day, occurrences: dayOccurrences }) => {
                const activeAbsences = dayAbsences(day);
                const isToday = format(day, "yyyy-MM-dd") === format(startOfToday(), "yyyy-MM-dd");

                return (
                  <article
                    key={day.toISOString()}
                    className={`rounded-[1.6rem] border p-4 ${
                      isToday
                        ? "border-[rgba(216,100,61,0.24)] bg-[rgba(216,100,61,0.08)]"
                        : "border-[var(--line)] bg-white/75"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--leaf-600)]">
                          {format(day, "EEEE", { locale: fr })}
                        </p>
                        <h4 className="mt-1 text-lg font-semibold text-[var(--ink-950)]">
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
                          {absence.notes ? (
                            <p className="mt-1 text-[11px] text-[var(--ink-700)]">{absence.notes}</p>
                          ) : null}
                        </div>
                      ))}

                      {dayOccurrences.length ? (
                        dayOccurrences.map((occurrence) => (
                          <div
                            aria-label={`${occurrence.taskTemplate.title} · ${occurrence.assignedMember?.displayName ?? "À attribuer"}`}
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
                      ) : !activeAbsences.length ? (
                        <p className="rounded-[1.1rem] border border-dashed border-[var(--line)] px-3 py-3 text-center text-xs text-[var(--ink-500)]">
                          Rien à signaler ce jour-là.
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="soft-panel p-4 text-sm leading-6 text-[var(--ink-700)] w-full">
                Aucune occurrence n&apos;est encore prévue pour ce mois.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="app-surface hidden overflow-hidden rounded-[2rem] md:block relative">
        <div className="absolute top-4 right-6 z-10">
          <button
            onClick={() => setViewType(viewType === "tasks" ? "minutes" : "tasks")}
            className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/90 backdrop-blur-md px-4 py-2 text-xs font-bold text-[var(--ink-800)] hover:bg-white transition-all shadow-md active:scale-95"
          >
            {viewType === "tasks" ? (
              <>
                <Clock className="size-3.5" />
                Vue minutes
              </>
            ) : (
              <>
                <ListTodo className="size-3.5" />
                Vue tâches
              </>
            )}
          </button>
        </div>

        {viewType === "minutes" ? (
          <div className="flex h-[30rem] items-end gap-1.5 px-8 pb-12 pt-24 overflow-x-hidden bg-gradient-to-b from-white to-[var(--ink-50)]/30">
            {minutesDays.map((day, idx) => {
              const isToday = format(day, "yyyy-MM-dd") === format(startOfToday(), "yyyy-MM-dd");
              const isPast = day < startOfToday() && !isToday;
              const dayOccurrences = occurrences.filter(
                (o) => format(o.scheduledDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
              );
              const totalMinutes = dayOccurrences.reduce((sum, o) => sum + o.taskTemplate.estimatedMinutes, 0);
              const maxVisibleMinutes = Math.max(
                60,
                ...minutesDays.map(d => occurrences.filter(o => format(o.scheduledDate, "yyyy-MM-dd") === format(d, "yyyy-MM-dd")).reduce((sum, o) => sum + o.taskTemplate.estimatedMinutes, 0))
              );
              const heightPercent = Math.min(100, (totalMinutes / maxVisibleMinutes) * 100);

              return (
                <div 
                  key={day.toISOString()} 
                  className={`flex flex-col items-center flex-1 transition-all duration-500 
                    ${isPast ? "opacity-30 grayscale" : "opacity-100"}
                    ${idx >= 7 ? "hidden lg:flex" : "flex"}
                    ${idx >= 12 ? "hidden xl:flex" : ""}
                  `}
                >
                  <div className="mb-4 h-6 flex items-center justify-center">
                    {totalMinutes > 0 && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isToday ? "bg-[var(--coral-100)] text-[var(--coral-700)]" : "bg-[var(--sky-100)] text-[var(--sky-700)]"}`}>
                        {totalMinutes}
                      </span>
                    )}
                  </div>
                  <div className="w-full max-w-[14px] bg-[var(--ink-100)]/50 rounded-full relative flex items-end justify-center group" style={{ height: "200px" }}>
                    {totalMinutes > 0 && (
                      <div 
                        className={`w-full rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-1000 ease-out ${isToday ? "bg-[var(--coral-500)]" : "bg-[var(--sky-500)]"}`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex flex-col items-center gap-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isToday ? "text-[var(--coral-600)]" : "text-[var(--ink-400)]"}`}>
                      {format(day, "EEE", { locale: fr }).substring(0, 3)}
                    </span>
                    <span className={`flex size-7 items-center justify-center rounded-full text-xs font-black transition-all ${isToday ? "bg-[var(--coral-500)] text-white shadow-lg shadow-coral-200" : "text-[var(--ink-800)]"}`}>
                      {format(day, "d")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 border-b border-[var(--line)] bg-white/50 pt-12">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((dName) => (
                <div key={dName} className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-[0.25em] text-[var(--ink-400)]">
                  {dName}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {gridDays.map((day) => {
                const dayOccurrences = occurrences.filter(
                  (o) => format(o.scheduledDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
                );
                const activeAbsences = dayAbsences(day);
                const isToday = format(day, "yyyy-MM-dd") === format(startOfToday(), "yyyy-MM-dd");
                const isVisible = day >= month && day <= addDays(month, 30);

                return (
                  <div
                    key={day.toISOString()}
                    className={`calendar-cell min-h-[110px] border-b border-r border-[var(--line)] px-2 py-3 align-top last:border-r-0 transition-colors ${isToday ? "bg-[var(--coral-50)]/40" : ""} ${!isVisible ? "bg-[var(--ink-50)]/20" : ""}`}
                  >
                    <div className={isVisible ? "" : "opacity-30"}>
                      <div className="mb-3 flex items-center justify-between px-1">
                        <p className={`text-sm font-black ${isToday ? "text-[var(--coral-600)]" : "text-[var(--ink-950)]"}`}>
                          {format(day, "d")}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {activeAbsences.map((absence) => (
                          <div
                            key={absence.id}
                            className="rounded-xl px-2.5 py-1.5 text-[10px] font-bold shadow-sm"
                            style={{
                              backgroundColor: hexToRgba(absence.member.color, 0.1),
                              color: "var(--ink-950)",
                              border: `1px solid ${hexToRgba(absence.member.color, 0.2)}`,
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="size-2 rounded-full shadow-inner" style={{ backgroundColor: absence.member.color }} />
                              <p className="truncate">Absence · {absence.member.displayName}</p>
                            </div>
                          </div>
                        ))}
                        {dayOccurrences.slice(0, 3).map((o) => (
                          <div
                            aria-label={`${o.taskTemplate.title} · ${o.assignedMember?.displayName ?? "À attribuer"}`}
                            key={o.id}
                            className="rounded-xl px-2.5 py-1.5 text-[10px] font-bold shadow-sm transition-all hover:scale-[1.02] hover:shadow-md cursor-default"
                            role="group"
                            style={{
                              backgroundColor: hexToRgba(o.taskTemplate.color ?? "#D8643D", 0.15),
                              color: "var(--ink-950)",
                              border: `1px solid ${hexToRgba(o.taskTemplate.color ?? "#D8643D", 0.25)}`,
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="size-2 rounded-full shadow-inner" style={{ backgroundColor: o.taskTemplate.color ?? "#D8643D" }} />
                              <p className="truncate">{o.taskTemplate.title}</p>
                            </div>
                          </div>
                        ))}
                        {dayOccurrences.length > 3 && (
                          <p className="px-2 pt-1 text-[9px] font-black uppercase tracking-tighter text-[var(--ink-400)]">
                            + {dayOccurrences.length - 3} plus
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
