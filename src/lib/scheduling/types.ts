export type RecurrenceRuleInput = {
  type: "daily" | "every_x_days" | "weekly" | "every_x_weeks" | "monthly_simple";
  interval: number;
  weekdays?: number[];
  dayOfMonth?: number | null;
  anchorDate: Date;
  dueOffsetDays?: number;
  config?: unknown;
};

export type AssignmentModeInput =
  | "fixed"
  | "manual"
  | "strict_alternation"
  | "round_robin"
  | "least_assigned_count"
  | "least_assigned_minutes";

export type AssignmentRuleInput = {
  mode: AssignmentModeInput;
  eligibleMemberIds: string[];
  fixedMemberId?: string | null;
  rotationOrder?: string[];
  fairnessWindowDays?: number | null;
  preserveRotationOnSkip?: boolean;
  preserveRotationOnReschedule?: boolean;
  rebalanceOnMemberAbsence?: boolean;
  lockAssigneeAfterGeneration?: boolean;
};

export type MemberInput = {
  id: string;
  displayName: string;
  isActive: boolean;
  weightingFactor?: number | null;
};

export type AbsenceInput = {
  memberId: string;
  startDate: Date;
  endDate: Date;
};

export type TaskTemplateInput = {
  id: string;
  householdId: string;
  title: string;
  estimatedMinutes: number;
  startsOn: Date;
  endsOn?: Date | null;
  recurrence: RecurrenceRuleInput;
  assignment: AssignmentRuleInput;
};

export type ExistingOccurrenceInput = {
  id?: string;
  sourceGenerationKey: string;
  scheduledDate: Date;
  dueDate: Date;
  assignedMemberId?: string | null;
  status: "planned" | "due" | "overdue" | "completed" | "skipped" | "rescheduled" | "cancelled";
  actualMinutes?: number | null;
  isManuallyModified?: boolean;
};

export type GeneratedOccurrence = {
  sourceGenerationKey: string;
  scheduledDate: Date;
  dueDate: Date;
  assignedMemberId?: string | null;
  status: "planned" | "due" | "overdue";
};
