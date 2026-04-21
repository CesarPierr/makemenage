import "server-only";

import { endOfMonth, endOfWeek, startOfMonth, startOfToday, startOfWeek, subDays } from "date-fns";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { syncHouseholdOccurrences } from "@/lib/scheduling/service";

export async function getCurrentHouseholdContext(userId: string, householdId?: string | null) {
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

  await syncHouseholdOccurrences(membership.householdId);

  const today = startOfToday();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [tasks, occurrences, actionLogs] = await Promise.all([
    db.taskTemplate.findMany({
      where: {
        householdId: membership.householdId,
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

export async function requireHouseholdContext(userId: string, householdId?: string | null) {
  const context = await getCurrentHouseholdContext(userId, householdId);

  if (!context) {
    redirect("/app?onboarding=1");
  }

  return context;
}

export function canManageHousehold(role: "owner" | "admin" | "member") {
  return role === "owner" || role === "admin";
}
