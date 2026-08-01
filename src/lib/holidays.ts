import "server-only";
import { addDays, differenceInCalendarDays, endOfDay, startOfDay } from "date-fns";

import { db } from "@/lib/db";

/**
 * Declare a holiday for the household. Occurrences are NOT shifted here — the
 * generator is holiday-aware (it pushes recurrence dates out of holiday windows),
 * so recording the window is enough; the caller runs a sync to apply it. This
 * avoids the old post-hoc flat-shift, which stranded tasks as manual overrides
 * and dragged the SLIDING base forward.
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

  return { holiday };
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
