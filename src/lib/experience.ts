import { format } from "date-fns";

type RoomOccurrenceLike = {
  scheduledDate: Date;
  taskTemplate: {
    room?: string | null;
    estimatedMinutes?: number | null;
  };
};

type CalendarOccurrenceLike = {
  scheduledDate: Date;
};

type CalendarAbsenceLike = {
  startDate: Date;
  endDate: Date;
};

export function sumOccurrenceMinutes(occurrences: RoomOccurrenceLike[]) {
  return occurrences.reduce(
    (sum, occurrence) => sum + (occurrence.taskTemplate.estimatedMinutes ?? 0),
    0,
  );
}

export function groupOccurrencesByRoom<T extends RoomOccurrenceLike>(occurrences: T[]) {
  const groups = occurrences.reduce<Map<string, T[]>>((acc, occurrence) => {
    const room = occurrence.taskTemplate.room?.trim() || "Tout l'appartement";
    const current = acc.get(room) ?? [];
    current.push(occurrence);
    acc.set(room, current);
    return acc;
  }, new Map());

  return [...groups.entries()]
    .map(([room, groupedOccurrences]) => ({
      room,
      occurrences: groupedOccurrences.sort(
        (left, right) => left.scheduledDate.getTime() - right.scheduledDate.getTime(),
      ),
      totalMinutes: sumOccurrenceMinutes(groupedOccurrences),
    }))
    .sort((left, right) => {
      if (left.room === "Tout l'appartement") {
        return -1;
      }

      if (right.room === "Tout l'appartement") {
        return 1;
      }

      return left.room.localeCompare(right.room, "fr");
    });
}

export function buildCalendarOverview(
  occurrences: CalendarOccurrenceLike[],
  absences: CalendarAbsenceLike[],
) {
  const busyDays = new Set(occurrences.map((occurrence) => format(occurrence.scheduledDate, "yyyy-MM-dd"))).size;
  const absenceDays = new Set(
    absences.flatMap((absence) => {
      const dates: string[] = [];
      const cursor = new Date(absence.startDate);

      while (cursor <= absence.endDate) {
        dates.push(format(cursor, "yyyy-MM-dd"));
        cursor.setDate(cursor.getDate() + 1);
      }

      return dates;
    }),
  ).size;

  return {
    taskCount: occurrences.length,
    busyDays,
    absenceCount: absences.length,
    absenceDays,
  };
}
