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

/**
 * Delete a holiday AND reverse its effect: every occurrence this holiday shifted
 * is moved back by the same number of days and un-marked as a manual override, so
 * the recurrence sync manages it normally again. Without this reversal, cancelling
 * a holiday left its tasks stranded in the future forever (they stayed
 * `isManuallyModified`, which the sync never touches).
 */
export async function deleteHoliday(params: { holidayId: string; householdId: string }) {
  const holiday = await db.householdHoliday.findFirst({
    where: { id: params.holidayId, householdId: params.householdId },
  });
  if (!holiday) return;

  const dayShift = differenceInCalendarDays(endOfDay(holiday.endDate), startOfDay(holiday.startDate)) + 1;
  const now = startOfDay(new Date());

  const logs = await db.occurrenceActionLog.findMany({
    where: {
      actionType: "rescheduled",
      newValues: { path: ["holidayId"], equals: params.holidayId },
      occurrence: { isManuallyModified: true, status: { in: ["planned", "due", "overdue"] } },
    },
    include: { occurrence: true },
  });

  for (const log of logs) {
    const occ = log.occurrence;
    if (!occ) continue;
    const restored = addDays(occ.scheduledDate, -dayShift);
    await db.taskOccurrence.update({
      where: { id: occ.id },
      data: {
        scheduledDate: restored,
        dueDate: addDays(occ.dueDate, -dayShift),
        status: startOfDay(restored) < now ? "overdue" : "planned",
        isManuallyModified: false,
        ...(occ.rescheduleCount > 0 ? { rescheduleCount: { decrement: 1 } } : {}),
      },
    });
  }

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
