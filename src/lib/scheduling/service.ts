import { addDays, endOfDay, startOfDay } from "date-fns";
import type { AssignmentMode, RecurrenceType } from "@prisma/client";

import { db } from "@/lib/db";
import { generateOccurrences } from "@/lib/scheduling/generator";
import { buildGenerationKey, computeNextAnchorAfter, generateRecurrenceDates } from "@/lib/scheduling/recurrence";
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
  mode: "FIXED" | "SLIDING";
  interval: number;
  weekdays: unknown;
  dayOfMonth: number | null;
  anchorDate: Date;
  dueOffsetDays: number;
}): RecurrenceRuleInput {
  return {
    type: rule.type,
    mode: rule.mode,
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
      lastCompletedAt: task.lastCompletedAt,
      recurrence: mapRecurrenceRule(task.recurrenceRule as any),
      assignment: mapAssignmentRule(task.assignmentRule as any, {
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

      const isPastOrDone = ["completed", "skipped"].includes(existing.status);
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

    // NEW: Orphan cancellation - cancel planned/due/overdue occurrences that are no longer generated
    // and haven't been manually modified or completed.
    const generatedKeysArray = Array.from(generatedKeys);
    await db.taskOccurrence.updateMany({
      where: {
        taskTemplateId: task.id,
        status: { in: ["planned", "due", "overdue"] },
        sourceGenerationKey: { notIn: generatedKeysArray },
        isManuallyModified: false,
        scheduledDate: { gte: start, lte: end },
      },
      data: { status: "cancelled" },
    });
  }
}

/**
 * For each task with an overdue occurrence, push the recurrence anchor forward to "interval
 * units after today" and let the next sync regenerate future occurrences. Each day the late
 * task remains undone, the next ones drift forward by a day — matching what an actual
 * completion would do on that day.
 *
 * Idempotent: if the next planned occurrence is already at or beyond the projected anchor,
 * the rule is left alone.
 */
export async function realignOverdueRecurrences(householdId: string) {
  const today = startOfDay(new Date());

  const tasks = await db.taskTemplate.findMany({
    where: {
      householdId,
      isActive: true,
      occurrences: { some: { status: "overdue" } },
    },
    include: { recurrenceRule: true },
  });

  let anyChange = false;

  for (const task of tasks) {
    if (!task.recurrenceRule) continue;

    const latestOverdue = await db.taskOccurrence.findFirst({
      where: { taskTemplateId: task.id, status: "overdue" },
      orderBy: { scheduledDate: "desc" },
      select: { scheduledDate: true },
    });
    if (!latestOverdue) continue;

    const nextOccurrence = await db.taskOccurrence.findFirst({
      where: {
        taskTemplateId: task.id,
        status: { in: ["planned", "due"] },
        scheduledDate: { gt: latestOverdue.scheduledDate },
      },
      orderBy: { scheduledDate: "asc" },
      select: { scheduledDate: true },
    });
    if (!nextOccurrence) continue;

    const rule = task.recurrenceRule;
    const newAnchor = computeNextAnchorAfter(
      {
        type: rule.type,
        mode: rule.mode as any,
        interval: rule.interval,
        weekdays: parseNumberArray(rule.weekdays),
        dayOfMonth: rule.dayOfMonth,
        anchorDate: rule.anchorDate,
        dueOffsetDays: rule.dueOffsetDays,
        config: rule.config,
      },
      today,
    );

    if (startOfDay(nextOccurrence.scheduledDate) >= startOfDay(newAnchor)) {
      continue;
    }

    await db.recurrenceRule.update({
      where: { id: rule.id },
      data: { anchorDate: newAnchor },
    });
    anyChange = true;
  }

  if (anyChange) {
    await syncHouseholdOccurrences(householdId);
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

  // Update lastCompletedAt on the template
  await db.taskTemplate.update({
    where: { id: existing.taskTemplateId },
    data: { lastCompletedAt: occurrence.completedAt },
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

  // Future occurrences always realign from the actual completion date so the recurrence
  // resumes "interval units from now" — early or late, the cadence remains stable.
  const today = startOfDay(new Date());

  if (existing.taskTemplate) {
    const ruleRecord = await db.recurrenceRule.findUnique({
      where: { id: existing.taskTemplate.recurrenceRuleId },
    });

    if (ruleRecord) {
      // ONLY for FIXED mode tasks, we manually realign the anchor.
      // SLIDING mode tasks rely on the generator to look at lastCompletedAt.
      if (ruleRecord.mode === "FIXED") {
        const nextAnchor = computeNextAnchorAfter(
          {
            type: ruleRecord.type,
            mode: "FIXED",
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

        // Cancel future ones for FIXED tasks specifically
        await db.taskOccurrence.updateMany({
          where: {
            taskTemplateId: existing.taskTemplate.id,
            status: { in: ["planned", "due", "overdue"] },
            scheduledDate: { gt: existing.scheduledDate },
          },
          data: { status: "cancelled" },
        });
      }

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
      rescheduleCount: { increment: 1 },
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

  if (existing.taskTemplate) {
    const ruleRecord = await db.recurrenceRule.findUnique({
      where: { id: existing.taskTemplate.recurrenceRuleId },
    });

    if (ruleRecord) {
      // For FIXED mode, we still move the anchor to the new date to "baseline" it.
      if (ruleRecord.mode === "FIXED") {
        await db.recurrenceRule.update({
          where: { id: existing.taskTemplate.recurrenceRuleId },
          data: { anchorDate: params.scheduledDate },
        });
      }

      // Re-key the current occurrence for stability
      // For SLIDING, the generator will pick up this rescheduled date as the new base
      // because it's "locked" (status = rescheduled).
      const newKey = buildGenerationKey(
        existing.taskTemplate.id,
        params.scheduledDate,
        ruleRecord.mode as any,
        ruleRecord.mode === "SLIDING" ? 0 : undefined, // Index will be recalculated during sync if needed
      );

      await db.taskOccurrence.update({
        where: { id: params.occurrenceId },
        data: { sourceGenerationKey: newKey },
      });

      // For FIXED, we preemptively cancel others. For SLIDING, sync will handle it.
      if (ruleRecord.mode === "FIXED") {
        await db.taskOccurrence.updateMany({
          where: {
            taskTemplateId: existing.taskTemplate.id,
            status: { in: ["planned", "due", "overdue"] },
            scheduledDate: { gt: params.scheduledDate },
          },
          data: { status: "cancelled" },
        });
      }

      await syncHouseholdOccurrences(existing.householdId, {
        taskId: existing.taskTemplate.id,
        forceOverwriteManual: false,
      });
    }
  }
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
