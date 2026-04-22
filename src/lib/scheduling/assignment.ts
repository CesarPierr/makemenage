import { addDays, isAfter, isBefore, startOfDay } from "date-fns";

import type {
  AbsenceInput,
  AssignmentRuleInput,
  ExistingOccurrenceInput,
  MemberInput,
} from "@/lib/scheduling/types";

function inWindow(date: Date, start: Date, end: Date) {
  return !isBefore(date, start) && !isAfter(date, end);
}

function isAbsent(memberId: string, date: Date, absences: AbsenceInput[]) {
  return absences.some(
    (absence) =>
      absence.memberId === memberId &&
      inWindow(startOfDay(date), startOfDay(absence.startDate), startOfDay(absence.endDate)),
  );
}

function getEligiblePool(
  rule: AssignmentRuleInput,
  members: MemberInput[],
  scheduledDate: Date,
  absences: AbsenceInput[],
) {
  const activeMembers = members.filter(
    (member) => member.isActive && rule.eligibleMemberIds.includes(member.id),
  );

  if (!rule.rebalanceOnMemberAbsence) {
    return activeMembers;
  }

  const available = activeMembers.filter((member) => !isAbsent(member.id, scheduledDate, absences));

  return available.length ? available : activeMembers;
}

export function pickAssignee(params: {
  sequenceIndex: number;
  rule: AssignmentRuleInput;
  members: MemberInput[];
  scheduledDate: Date;
  absences: AbsenceInput[];
  estimatedMinutes: number;
  existingOccurrences: ExistingOccurrenceInput[];
}) {
  const { rule, members, scheduledDate, absences, existingOccurrences, sequenceIndex, estimatedMinutes } =
    params;
  const pool = getEligiblePool(rule, members, scheduledDate, absences);

  if (!pool.length) {
    return null;
  }

  if (rule.mode === "manual") {
    return null;
  }

  if (rule.mode === "fixed") {
    return (
      pool.find((member) => member.id === rule.fixedMemberId)?.id ??
      pool[0]?.id ??
      null
    );
  }

  const rotation = (rule.rotationOrder?.length ? rule.rotationOrder : pool.map((member) => member.id)).filter(
    (id) => pool.some((member) => member.id === id),
  );

  if (rule.mode === "strict_alternation" || rule.mode === "round_robin") {
    const priorAssignments = existingOccurrences
      .filter(
        (occurrence) =>
          occurrence.status !== "cancelled" &&
          (occurrence.status !== "skipped" || rule.preserveRotationOnSkip !== false) &&
          (occurrence.status !== "rescheduled" || rule.preserveRotationOnReschedule !== false) &&
          occurrence.assignedMemberId &&
          rotation.includes(occurrence.assignedMemberId) &&
          startOfDay(occurrence.scheduledDate) < startOfDay(scheduledDate),
      )
      .sort((left, right) => left.scheduledDate.getTime() - right.scheduledDate.getTime());

    const lastAssignedMemberId = priorAssignments.at(-1)?.assignedMemberId ?? null;

    if (lastAssignedMemberId) {
      const currentIndex = rotation.indexOf(lastAssignedMemberId);
      if (currentIndex >= 0) {
        return rotation[(currentIndex + 1) % rotation.length] ?? pool[0]?.id ?? null;
      }
    }

    return rotation[sequenceIndex % rotation.length] ?? pool[0]?.id ?? null;
  }

  const windowDays = rule.fairnessWindowDays ?? 14;
  const start = addDays(startOfDay(scheduledDate), -windowDays);
  const end = addDays(startOfDay(scheduledDate), windowDays);

  const scores = pool.map((member) => {
    const assigned = existingOccurrences.filter(
      (occurrence) =>
        occurrence.assignedMemberId === member.id &&
        inWindow(startOfDay(occurrence.scheduledDate), start, end) &&
        occurrence.status !== "cancelled",
    );

    return {
      memberId: member.id,
      count: assigned.length,
      minutes: assigned.reduce((sum, occurrence) => sum + (occurrence.actualMinutes ?? estimatedMinutes), 0),
      rotationRank: rotation.indexOf(member.id) === -1 ? Number.MAX_SAFE_INTEGER : rotation.indexOf(member.id),
    };
  });

  scores.sort((left, right) => {
    if (rule.mode === "least_assigned_minutes" && left.minutes !== right.minutes) {
      return left.minutes - right.minutes;
    }

    if (left.count !== right.count) {
      return left.count - right.count;
    }

    if (left.minutes !== right.minutes) {
      return left.minutes - right.minutes;
    }

    return left.rotationRank - right.rotationRank;
  });

  return scores[0]?.memberId ?? null;
}
