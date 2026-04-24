import {
  addDays,
  endOfWeek,
  startOfToday,
  startOfWeek,
  subDays,
} from "date-fns";
import { redirect } from "next/navigation";

import { shouldSyncHouseholdContext, resetHouseholdContextSyncState } from "@/lib/context-sync";
import { db } from "@/lib/db";
import { logWarn } from "@/lib/logger";
import { syncHouseholdOccurrences } from "@/lib/scheduling/service";

type HouseholdContextOptions = {
  monthDate?: Date;
  monthSpan?: number;
};

export async function getCurrentHouseholdContext(
  userId: string,
  householdId?: string | null,
  options?: HouseholdContextOptions,
) {
  const membership = await db.householdMember.findFirst({
    where: {
      userId,
      ...(householdId ? { householdId } : {}),
    },
    include: {
      household: {
        include: {
          members: {
            include: {
              availabilities: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    return null;
  }

  if (shouldSyncHouseholdContext(membership.householdId)) {
    try {
      await syncHouseholdOccurrences(membership.householdId);
    } catch (error) {
      resetHouseholdContextSyncState(membership.householdId);
      logWarn("household.context_sync_failed", {
        householdId: membership.householdId,
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const today = startOfToday();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthBaseDate = options?.monthDate ?? today;
  const monthSpan = options?.monthSpan ?? 1;
  
  // For a sliding month view, we start from the requested date or today (whichever is later)
  // so that past days are hidden as requested.
  const monthStart = monthBaseDate < today ? today : monthBaseDate;
  const monthEnd = addDays(monthStart, 30 * monthSpan);

  const [tasks, occurrences, actionLogs] = await Promise.all([
    db.taskTemplate.findMany({
      where: {
        householdId: membership.householdId,
        isActive: true,
      },
      include: {
        recurrenceRule: true,
        assignmentRule: true,
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    }),
    db.taskOccurrence.findMany({
      where: {
        householdId: membership.householdId,
        scheduledDate: {
          gte: subDays(today, 30),
          lte: monthEnd,
        },
        status: { not: "cancelled" },
      },
      include: {
        taskTemplate: true,
        assignedMember: true,
        completedByMember: true,
      },
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "asc" }],
    }),
    db.occurrenceActionLog.findMany({
      where: {
        occurrence: {
          householdId: membership.householdId,
        },
      },
      include: {
        occurrence: {
          include: {
            taskTemplate: true,
          },
        },
        actorMember: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 40,
    }),
  ]);

  return {
    membership,
    household: membership.household,
    currentMember: membership.household.members.find((member) => member.userId === userId) ?? null,
    tasks,
    occurrences,
    actionLogs,
    weekOccurrences: occurrences.filter(
      (occurrence) =>
        occurrence.scheduledDate >= currentWeekStart && occurrence.scheduledDate <= currentWeekEnd,
    ),
    monthOccurrences: occurrences.filter(
      (occurrence) => occurrence.scheduledDate >= monthStart && occurrence.scheduledDate <= monthEnd,
    ),
    overdueOccurrences: occurrences.filter(
      (occurrence) => occurrence.status === "overdue" || occurrence.status === "planned",
    ),
  };
}

export async function requireHouseholdContext(
  userId: string,
  householdId?: string | null,
  options?: HouseholdContextOptions,
) {
  const context = await getCurrentHouseholdContext(userId, householdId, options);

  if (!context) {
    redirect("/app?onboarding=1");
  }

  return context;
}

export function canManageHousehold(role: "owner" | "admin" | "member") {
  return role === "owner" || role === "admin";
}
