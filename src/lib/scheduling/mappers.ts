import "server-only";

import type { AssignmentMode, RecurrenceType } from "@prisma/client";

import type {
  AbsenceInput,
  AssignmentRuleInput,
  ExistingOccurrenceInput,
  MemberInput,
  RecurrenceRuleInput,
} from "@/lib/scheduling/types";

export function parseStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function parseNumberArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 6)
    : [];
}

export function mapMembers(
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

export function mapAbsences(
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

export function mapRecurrenceRule(rule: {
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

export function mapAssignmentRule(rule: {
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

export function mapExistingOccurrences(
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
