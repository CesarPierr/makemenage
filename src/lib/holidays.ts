import "server-only";
import { addDays, differenceInCalendarDays, endOfDay, startOfDay } from "date-fns";

import { db } from "@/lib/db";

/**
 * Declare a holiday for the household: every active occurrence whose scheduledDate falls
 * inside [startDate, endDate] is shifted forward by `(endDate - startDate + 1)` days. The
 * shifted occurrences are marked `isManuallyModified` so the recurrence sync won't put
 * them back, and an action log entry of type `rescheduled` is recorded for traceability.
 */
export async function declareHoliday(params: {
  householdId: string;
  startDate: Date;
  endDate: Date;
  label?: string | null;
  actorMemberId?: string | null;
}) {
  const start = startOfDay(params.startDate);
  const end = endOfDay(params.endDate);

  if (end < start) {
    throw new Error("endDate must be >= startDate");
  }

  const holiday = await db.householdHoliday.create({
    data: {
      householdId: params.householdId,
      startDate: start,
      endDate: end,
      label: params.label ?? null,
    },
  });

  const affected = await db.taskOccurrence.findMany({
    where: {
      householdId: params.householdId,
      scheduledDate: { gte: start, lte: end },
      status: { in: ["planned", "due", "overdue"] },
    },
    orderBy: { scheduledDate: "asc" },
  });

  const dayShift = differenceInCalendarDays(end, start) + 1;
  const now = new Date();

  for (const occ of affected) {
    const newScheduled = addDays(occ.scheduledDate, dayShift);
    const newDue = addDays(occ.dueDate, dayShift);

    await db.taskOccurrence.update({
      where: { id: occ.id },
      data: {
        scheduledDate: newScheduled,
        dueDate: newDue,
        status: newScheduled < now ? "overdue" : "planned",
        isManuallyModified: true,
        rescheduleCount: { increment: 1 },
      },
    });

    await db.occurrenceActionLog.create({
      data: {
        occurrenceId: occ.id,
        actionType: "rescheduled",
        actorMemberId: params.actorMemberId ?? undefined,
        previousValues: { scheduledDate: occ.scheduledDate.toISOString() },
        newValues: {
          scheduledDate: newScheduled.toISOString(),
          reason: "holiday",
          holidayId: holiday.id,
        },
      },
    });
  }

  return { holiday, shiftedCount: affected.length, dayShift };
}

export async function deleteHoliday(params: { holidayId: string; householdId: string }) {
  await db.householdHoliday.deleteMany({
    where: { id: params.holidayId, householdId: params.householdId },
  });
}

export async function listHolidays(householdId: string) {
  return db.householdHoliday.findMany({
    where: { householdId },
    orderBy: { startDate: "desc" },
  });
}
