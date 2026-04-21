import { eachDayOfInterval, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

type CalendarMonthProps = {
  month: Date;
  occurrences: {
    id: string;
    scheduledDate: Date;
    status: string;
    taskTemplate: { title: string };
    assignedMember: { displayName: string; color: string } | null;
  }[];
};

export function CalendarMonth({ month, occurrences }: CalendarMonthProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(month.getFullYear(), month.getMonth() + 1, 0), { weekStartsOn: 1 }),
  });

  return (
    <div className="app-surface overflow-hidden rounded-[2rem]">
      <div className="grid grid-cols-7 border-b border-[var(--line)] bg-white/50">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
          <div key={day} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ink-700)]">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayOccurrences = occurrences.filter(
            (occurrence) => format(occurrence.scheduledDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
          );

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
                  {dayOccurrences.slice(0, 3).map((occurrence) => (
                    <div
                      key={occurrence.id}
                      className="rounded-xl px-2 py-1 text-xs leading-5 text-white"
                      style={{ backgroundColor: occurrence.assignedMember?.color ?? "#6A4C93" }}
                    >
                      <p className="truncate font-semibold">{occurrence.taskTemplate.title}</p>
                      <p className="truncate opacity-90">
                        {occurrence.assignedMember?.displayName ?? "À attribuer"}
                      </p>
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
  );
}
