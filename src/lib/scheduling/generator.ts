import { startOfDay } from "date-fns";

import { pickAssignee } from "@/lib/scheduling/assignment";
import { buildGenerationKey, computeDueDate, generateRecurrenceDates } from "@/lib/scheduling/recurrence";
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
  const recurrenceDates = generateRecurrenceDates(template.recurrence, rangeStart, rangeEnd).filter(
    (date) => date >= startOfDay(template.startsOn) && (!template.endsOn || date <= startOfDay(template.endsOn)),
  );

  const generated: GeneratedOccurrence[] = [];
  const mergedExisting = [...existingOccurrences];

  recurrenceDates.forEach((scheduledDate, sequenceIndex) => {
    const sourceGenerationKey = buildGenerationKey(template.id, scheduledDate);
    const existing = existingOccurrences.find(
      (occurrence) => occurrence.sourceGenerationKey === sourceGenerationKey,
    );

    if (existing && (existing.isManuallyModified || ["completed", "skipped", "rescheduled"].includes(existing.status))) {
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
