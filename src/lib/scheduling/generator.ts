import { startOfDay } from "date-fns";

import { pickAssignee } from "@/lib/scheduling/assignment";
import { buildGenerationKey, computeDueDate, generateRecurrenceDates, getStableSequenceIndex } from "@/lib/scheduling/recurrence";
import type {
  AbsenceInput,
  ExistingOccurrenceInput,
  GeneratedOccurrence,
  MemberInput,
  TaskTemplateInput,
} from "@/lib/scheduling/types";
import { isPastDay } from "@/lib/time";

export function generateOccurrences(params: {
  template: TaskTemplateInput;
  members: MemberInput[];
  absences: AbsenceInput[];
  existingOccurrences: ExistingOccurrenceInput[];
  rangeStart: Date;
  rangeEnd: Date;
}) {
  const { template, members, absences, existingOccurrences, rangeStart, rangeEnd } = params;
  const isSliding = template.recurrence.mode === "SLIDING";
  const today = startOfDay(new Date());

  // For sliding tasks, find the most recent "realized" or "locked" occurrence
  // that serves as the base for the next generation.
  let baseDate = startOfDay(template.startsOn);
  let baseIndex = 0;

  if (isSliding) {
    // We look at ALL existing occurrences to find the latest one that is "locked"
    // (completed, skipped, rescheduled, or manually modified)
    const lockedOccurrences = existingOccurrences
      .filter(
        (o) =>
          o.isManuallyModified || ["completed", "skipped", "rescheduled"].includes(o.status),
      )
      .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());

    if (lockedOccurrences.length > 0) {
      const latest = lockedOccurrences[0];
      baseDate = startOfDay(latest.scheduledDate);
      // Extract index from key if possible: "id:sliding:4" -> 4
      const parts = latest.sourceGenerationKey.split(":sliding:");
      if (parts.length === 2) {
        baseIndex = parseInt(parts[1], 10);
      }
    } else {
      // No locked occurrences, use the template anchor or startsOn as base index 0
      baseDate = startOfDay(template.recurrence.anchorDate);
      baseIndex = 0;
    }
  }

  const recurrenceDates = generateRecurrenceDates(
    template.recurrence,
    rangeStart,
    rangeEnd,
    isSliding ? { baseDate, baseIndex } : undefined,
  ).filter(
    (date) =>
      date >= startOfDay(template.startsOn) &&
      (!template.endsOn || date <= startOfDay(template.endsOn)),
  );

  const generated: GeneratedOccurrence[] = [];
  const mergedExisting = existingOccurrences.filter(
    (occurrence) =>
      occurrence.isManuallyModified ||
      ["completed", "skipped", "rescheduled", "cancelled"].includes(occurrence.status) ||
      startOfDay(occurrence.scheduledDate) < today,
  );

  recurrenceDates.forEach((scheduledDate) => {
    const sequenceIndex = getStableSequenceIndex(
      template.recurrence,
      scheduledDate,
      isSliding ? { baseDate, baseIndex } : undefined,
    );
    const sourceGenerationKey = buildGenerationKey(
      template.id,
      scheduledDate,
      template.recurrence.mode,
      sequenceIndex,
    );
    const existing = existingOccurrences.find(
      (occurrence) => occurrence.sourceGenerationKey === sourceGenerationKey,
    );

    if (
      existing &&
      (existing.isManuallyModified ||
        ["completed", "skipped", "rescheduled"].includes(existing.status))
    ) {
      return;
    }

    const assignedMemberId = pickAssignee({
      sequenceIndex,
      rule: template.assignment,
      members,
      scheduledDate,
      absences,
      estimatedMinutes: template.estimatedMinutes,
      existingOccurrences: mergedExisting,
    });

    const occurrence = {
      sourceGenerationKey,
      scheduledDate,
      dueDate: computeDueDate(scheduledDate, template.recurrence.dueOffsetDays ?? 0),
      assignedMemberId,
      status: (isPastDay(scheduledDate) ? "overdue" : "planned") as "planned" | "due" | "overdue",
    };

    generated.push(occurrence);
    mergedExisting.push({
      sourceGenerationKey,
      scheduledDate,
      dueDate: occurrence.dueDate,
      assignedMemberId,
      status: occurrence.status,
    });
  });

  return generated;
}
