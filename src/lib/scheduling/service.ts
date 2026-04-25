import { addDays, endOfDay, startOfDay } from "date-fns";
import type { AssignmentMode, RecurrenceType } from "@prisma/client";

import { db } from "@/lib/db";
import { generateOccurrences } from "@/lib/scheduling/generator";
import { computeNextAnchorAfter } from "@/lib/scheduling/recurrence";
import type {
  AbsenceInput,
  AssignmentRuleInput,
  ExistingOccurrenceInput,
  MemberInput,
  RecurrenceRuleInput,
  TaskTemplateInput,
} from "@/lib/scheduling/types";
import { getGenerationWindow } from "@/lib/time";

function parseStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function parseNumberArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 6)
    : [];
}

function mapMembers(
  members: {
    id: string;
    displayName: string;
    isActive: boolean;
    weightingFactor: number;
  }[],
): MemberInput[] {
  return members.map((member) => ({
    id: member.id,
    displayName: member.displayName,
    isActive: member.isActive,
    weightingFactor: member.weightingFactor,
  }));
}

function mapAbsences(
  members: {
    id: string;
    availabilities: { startDate: Date; endDate: Date; type: string }[];
  }[],
): AbsenceInput[] {
  return members.flatMap((member) =>
    member.availabilities
      .filter((availability) => availability.type === "date_range_absence")
      .map((availability) => ({
        memberId: member.id,
        startDate: availability.startDate,
        endDate: availability.endDate,
      })),
  );
}

function mapRecurrenceRule(rule: {
  type: RecurrenceType;
  interval: number;
  weekdays: unknown;
  dayOfMonth: number | null;
  anchorDate: Date;
  dueOffsetDays: number;
}): RecurrenceRuleInput {
  return {
    type: rule.type,
    interval: rule.interval,
    weekdays: parseNumberArray(rule.weekdays),
    dayOfMonth: rule.dayOfMonth,
    anchorDate: rule.anchorDate,
    dueOffsetDays: rule.dueOffsetDays,
  };
}

function mapAssignmentRule(rule: {
  mode: AssignmentMode;
  eligibleMemberIds: unknown;
  fixedMemberId: string | null;
  rotationOrder: unknown;
  fairnessWindowDays: number | null;
  preserveRotationOnSkip: boolean;
  preserveRotationOnReschedule: boolean;
  rebalanceOnMemberAbsence: boolean;
  lockAssigneeAfterGeneration: boolean;
}, options?: { preserveRotationOnSkip?: boolean | null }): AssignmentRuleInput {
  return {
    mode: rule.mode,
    eligibleMemberIds: parseStringArray(rule.eligibleMemberIds),
    fixedMemberId: rule.fixedMemberId,
    rotationOrder: parseStringArray(rule.rotationOrder),
    fairnessWindowDays: rule.fairnessWindowDays,
    preserveRotationOnSkip: options?.preserveRotationOnSkip ?? rule.preserveRotationOnSkip,
    preserveRotationOnReschedule: rule.preserveRotationOnReschedule,
    rebalanceOnMemberAbsence: rule.rebalanceOnMemberAbsence,
    lockAssigneeAfterGeneration: rule.lockAssigneeAfterGeneration,
  };
}

function mapExistingOccurrences(
  occurrences: {
    id: string;
    sourceGenerationKey: string;
    scheduledDate: Date;
    dueDate: Date;
    assignedMemberId: string | null;
    status:
      | "planned"
      | "due"
      | "overdue"
      | "completed"
      | "skipped"
      | "rescheduled"
      | "cancelled";
    actualMinutes: number | null;
    isManuallyModified: boolean;
  }[],
): ExistingOccurrenceInput[] {
  return occurrences.map((occurrence) => ({
    id: occurrence.id,
    sourceGenerationKey: occurrence.sourceGenerationKey,
    scheduledDate: occurrence.scheduledDate,
    dueDate: occurrence.dueDate,
    assignedMemberId: occurrence.assignedMemberId,
    status: occurrence.status,
    actualMinutes: occurrence.actualMinutes,
    isManuallyModified: occurrence.isManuallyModified,
  }));
}

export async function syncHouseholdOccurrences(
  householdId: string,
  options?: {
    taskId?: string;
    forceOverwriteManual?: boolean;
    preserveRotationOnSkipOverride?: boolean | null;
  },
) {
  const household = await db.household.findUnique({
    where: {
      id: householdId,
    },
    include: {
      members: {
        include: {
          availabilities: true,
        },
      },
      tasks: {
        where: {
          isActive: true,
          ...(options?.taskId ? { id: options.taskId } : {}),
        },
        include: {
          recurrenceRule: true,
          assignmentRule: true,
          occurrences: {
            where: {
              scheduledDate: {
                gte: addDays(startOfDay(new Date()), -45),
                lte: addDays(endOfDay(new Date()), 90),
              },
            },
          },
        },
      },
    },
  });

  if (!household) {
    return;
  }

  const { start, end } = getGenerationWindow();
  const members = mapMembers(household.members);
  const absences = mapAbsences(household.members);

  for (const task of household.tasks) {
    const template: TaskTemplateInput = {
      id: task.id,
      householdId: task.householdId,
      title: task.title,
      estimatedMinutes: task.estimatedMinutes,
      startsOn: task.startsOn,
      endsOn: task.endsOn,
      recurrence: mapRecurrenceRule(task.recurrenceRule),
      assignment: mapAssignmentRule(task.assignmentRule, {
        preserveRotationOnSkip: options?.preserveRotationOnSkipOverride ?? null,
      }),
    };

    const existingOccurrences = mapExistingOccurrences(task.occurrences);
    const generated = generateOccurrences({
      template,
      members,
      absences,
      existingOccurrences,
      rangeStart: start,
      rangeEnd: end,
    });

    const generatedKeys = new Set(generated.map((occurrence) => occurrence.sourceGenerationKey));

    for (const occurrence of generated) {
      const existing = task.occurrences.find(
        (item) => item.sourceGenerationKey === occurrence.sourceGenerationKey,
      );

      if (!existing) {
        const created = await db.taskOccurrence.create({
          data: {
            householdId,
            taskTemplateId: task.id,
            scheduledDate: occurrence.scheduledDate,
            dueDate: occurrence.dueDate,
            assignedMemberId: occurrence.assignedMemberId,
            status: occurrence.status,
            sourceGenerationKey: occurrence.sourceGenerationKey,
            originalScheduledDate: occurrence.scheduledDate,
          },
        });

        await db.occurrenceActionLog.create({
          data: {
            occurrenceId: created.id,
            actionType: "created",
            newValues: {
              scheduledDate: occurrence.scheduledDate.toISOString(),
              assignedMemberId: occurrence.assignedMemberId,
            },
          },
        });

        continue;
      }

      const isPastOrDone = ["completed", "skipped", "cancelled"].includes(existing.status);
      const isRescheduled = existing.status === "rescheduled";
      const isProtected = (existing.isManuallyModified || isRescheduled) && !options?.forceOverwriteManual;

      if (isPastOrDone || isProtected) {
        continue;
      }

      if (
        existing.assignedMemberId !== occurrence.assignedMemberId ||
        existing.scheduledDate.getTime() !== occurrence.scheduledDate.getTime() ||
        existing.status !== occurrence.status ||
        (existing.isManuallyModified && options?.forceOverwriteManual)
      ) {
        await db.taskOccurrence.update({
          where: { id: existing.id },
          data: {
            scheduledDate: occurrence.scheduledDate,
            dueDate: occurrence.dueDate,
            assignedMemberId: occurrence.assignedMemberId,
            status: occurrence.status,
            ...(options?.forceOverwriteManual ? { isManuallyModified: false } : {}),
          },
        });
      }
    }

    for (const existing of task.occurrences) {
      const isPastOrDone = ["completed", "skipped", "cancelled"].includes(existing.status);
      const isRescheduled = existing.status === "rescheduled";
      const isProtected = (existing.isManuallyModified || isRescheduled) && !options?.forceOverwriteManual;

      if (
        existing.scheduledDate >= startOfDay(new Date()) &&
        !isProtected &&
        !generatedKeys.has(existing.sourceGenerationKey) &&
        !isPastOrDone
      ) {
        await db.taskOccurrence.update({
          where: { id: existing.id },
          data: {
            status: "cancelled",
            ...(options?.forceOverwriteManual ? { isManuallyModified: false } : {}),
          },
        });
      }
    }
  }
}

export async function addMemberToExistingAssignments(params: {
  householdId: string;
  memberId: string;
}) {
  const tasks = await db.taskTemplate.findMany({
    where: {
      householdId: params.householdId,
      isActive: true,
    },
    include: {
      assignmentRule: true,
    },
  });

  for (const task of tasks) {
    if (task.assignmentRule.mode === "fixed" || task.assignmentRule.mode === "manual") {
      continue;
    }

    const eligibleMemberIds = parseStringArray(task.assignmentRule.eligibleMemberIds);

    if (eligibleMemberIds.includes(params.memberId)) {
      continue;
    }

    const rotationOrder = parseStringArray(task.assignmentRule.rotationOrder);
    const nextEligibleMemberIds = [...eligibleMemberIds, params.memberId];
    const nextRotationOrder = rotationOrder.length
      ? [...rotationOrder.filter((memberId) => memberId !== params.memberId), params.memberId]
      : nextEligibleMemberIds;

    await db.assignmentRule.update({
      where: {
        id: task.assignmentRuleId,
      },
      data: {
        eligibleMemberIds: nextEligibleMemberIds,
        rotationOrder: nextRotationOrder,
      },
    });
  }

  await syncHouseholdOccurrences(params.householdId);
}

export async function completeOccurrence(params: {
  occurrenceId: string;
  actorMemberId?: string | null;
  actualMinutes?: number;
  notes?: string;
  shiftFutureOccurrences?: boolean;
  wasCompletedAlone?: boolean;
}) {
  const existing = await db.taskOccurrence.findUnique({
    where: {
      id: params.occurrenceId,
    },
    include: {
      taskTemplate: {
        include: {
          recurrenceRule: true,
        },
      },
    },
  });

  if (!existing) {
    return;
  }

  const occurrence = await db.taskOccurrence.update({
    where: {
      id: params.occurrenceId,
    },
    data: {
      status: "completed",
      completedAt: existing.completedAt ?? new Date(),
      completedByMemberId: params.actorMemberId ?? existing.completedByMemberId ?? undefined,
      actualMinutes: params.actualMinutes ?? existing.actualMinutes,
      notes: params.notes ?? existing.notes,
      wasCompletedAlone: params.wasCompletedAlone ?? existing.wasCompletedAlone,
      isManuallyModified: true,
    },
  });

  await db.occurrenceActionLog.create({
    data: {
      occurrenceId: occurrence.id,
      actionType: "completed",
      actorMemberId: params.actorMemberId ?? undefined,
      previousValues: {
        status: existing.status,
        actualMinutes: existing.actualMinutes,
        notes: existing.notes,
      },
      newValues: {
        actualMinutes: params.actualMinutes ?? existing.actualMinutes,
        notes: params.notes ?? existing.notes,
        wasCompletedAlone: params.wasCompletedAlone ?? existing.wasCompletedAlone,
      },
    },
  });

  // Decide whether future occurrences should be shifted:
  // - explicitly requested by the user, OR
  // - the completed occurrence was overdue / scheduled in the past (auto-realign so the
  //   recurrence resumes "interval days from the actual completion date" — e.g. an
  //   every-2-weeks task that was 5 days late should still come back in 2 weeks, not
  //   in 9 days as if nothing had slipped).
  const today = startOfDay(new Date());
  const wasOverdue =
    existing.status === "overdue" || startOfDay(existing.scheduledDate).getTime() < today.getTime();
  const effectiveShift = Boolean(params.shiftFutureOccurrences) || wasOverdue;

  if (effectiveShift && existing.taskTemplate) {
    const ruleRecord = await db.recurrenceRule.findUnique({
      where: { id: existing.taskTemplate.recurrenceRuleId },
    });

    if (ruleRecord) {
      const nextAnchor = computeNextAnchorAfter(
        {
          type: ruleRecord.type,
          interval: ruleRecord.interval,
          weekdays: parseNumberArray(ruleRecord.weekdays),
          dayOfMonth: ruleRecord.dayOfMonth,
          anchorDate: ruleRecord.anchorDate,
          dueOffsetDays: ruleRecord.dueOffsetDays,
          config: ruleRecord.config,
        },
        today,
      );

      await db.recurrenceRule.update({
        where: { id: existing.taskTemplate.recurrenceRuleId },
        data: { anchorDate: nextAnchor },
      });

      // Cancel any planned/due/overdue occurrences in the future that no longer match the
      // new anchor (i.e. the old, pre-shift schedule). The sync below will then create the
      // correctly-spaced future occurrences.
      await db.taskOccurrence.updateMany({
        where: {
          taskTemplateId: existing.taskTemplate.id,
          status: { in: ["planned", "due", "overdue"] },
          scheduledDate: { gt: existing.scheduledDate },
        },
        data: { status: "cancelled" },
      });

      await syncHouseholdOccurrences(existing.householdId, {
        taskId: existing.taskTemplate.id,
        forceOverwriteManual: false,
      });
    }
  }
}

export async function skipOccurrence(params: {
  occurrenceId: string;
  actorMemberId?: string | null;
  notes?: string;
}) {
  const existing = await db.taskOccurrence.findUnique({
    where: {
      id: params.occurrenceId,
    },
  });

  if (!existing) {
    return;
  }

  const occurrence = await db.taskOccurrence.update({
    where: {
      id: params.occurrenceId,
    },
    data: {
      status: "skipped",
      completedAt: null,
      completedByMemberId: null,
      actualMinutes: null,
      notes: params.notes ?? existing.notes,
      isManuallyModified: true,
    },
  });

  await db.occurrenceActionLog.create({
    data: {
      occurrenceId: occurrence.id,
      actionType: "skipped",
      actorMemberId: params.actorMemberId ?? undefined,
      previousValues: {
        status: existing.status,
        actualMinutes: existing.actualMinutes,
        notes: existing.notes,
      },
      newValues: {
        notes: params.notes ?? existing.notes,
      },
    },
  });
}

export async function rescheduleOccurrence(params: {
  occurrenceId: string;
  actorMemberId?: string | null;
  scheduledDate: Date;
  notes?: string;
}) {
  const existing = await db.taskOccurrence.findUnique({
    where: {
      id: params.occurrenceId,
    },
  });

  if (!existing) {
    return;
  }

  const dueDate = endOfDay(params.scheduledDate);
  const occurrence = await db.taskOccurrence.update({
    where: {
      id: params.occurrenceId,
    },
    data: {
      scheduledDate: params.scheduledDate,
      dueDate,
      status: "rescheduled",
      notes: params.notes ?? existing.notes,
      isManuallyModified: true,
    },
  });

  await db.occurrenceActionLog.create({
    data: {
      occurrenceId: occurrence.id,
      actionType: "rescheduled",
      actorMemberId: params.actorMemberId ?? undefined,
      previousValues: {
        scheduledDate: existing.scheduledDate.toISOString(),
        notes: existing.notes,
      },
      newValues: {
        scheduledDate: params.scheduledDate.toISOString(),
        notes: params.notes ?? existing.notes,
      },
    },
  });
}

export async function reassignOccurrence(params: {
  occurrenceId: string;
  actorMemberId?: string | null;
  assignedMemberId: string;
  notes?: string;
}) {
  const existing = await db.taskOccurrence.findUnique({
    where: {
      id: params.occurrenceId,
    },
  });

  if (!existing) {
    return;
  }

  const occurrence = await db.taskOccurrence.update({
    where: {
      id: params.occurrenceId,
    },
    data: {
      assignedMemberId: params.assignedMemberId,
      notes: params.notes ?? existing.notes,
      isManuallyModified: true,
    },
  });

  await db.occurrenceActionLog.create({
    data: {
      occurrenceId: occurrence.id,
      actionType: "reassigned",
      actorMemberId: params.actorMemberId ?? undefined,
      previousValues: {
        assignedMemberId: existing.assignedMemberId,
        notes: existing.notes,
      },
      newValues: {
        assignedMemberId: params.assignedMemberId,
        notes: params.notes ?? existing.notes,
      },
    },
  });
}

export async function reopenOccurrence(params: {
  occurrenceId: string;
  actorMemberId?: string | null;
  notes?: string;
}) {
  const existing = await db.taskOccurrence.findUnique({
    where: {
      id: params.occurrenceId,
    },
  });

  if (!existing) {
    return;
  }

  const reopenedStatus = startOfDay(existing.scheduledDate) < startOfDay(new Date()) ? "overdue" : "planned";
  const occurrence = await db.taskOccurrence.update({
    where: {
      id: params.occurrenceId,
    },
    data: {
      status: reopenedStatus,
      completedAt: null,
      completedByMemberId: null,
      actualMinutes: null,
      notes: params.notes ?? existing.notes,
      isManuallyModified: true,
    },
  });

  await db.occurrenceActionLog.create({
    data: {
      occurrenceId: occurrence.id,
      actionType: "edited",
      actorMemberId: params.actorMemberId ?? undefined,
      previousValues: {
        status: existing.status,
        completedAt: existing.completedAt?.toISOString() ?? null,
        completedByMemberId: existing.completedByMemberId,
        actualMinutes: existing.actualMinutes,
        notes: existing.notes,
      },
      newValues: {
        status: reopenedStatus,
        completedAt: null,
        completedByMemberId: null,
        actualMinutes: null,
        notes: params.notes ?? existing.notes,
      },
    },
  });
}
