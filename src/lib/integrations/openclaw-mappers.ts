import type { AssignmentMode, HouseholdIntegration, RecurrenceType } from "@prisma/client";
import type { OpenClawIntegrationSettingsSnapshot } from "@/lib/integrations/types";

export type ActiveMember = {
  id: string;
  displayName: string;
  color: string;
};

export function parseStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function parseNumberArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => Number.isInteger(entry) && entry >= 0 && entry <= 6)
    : [];
}

export function nullableString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function cleanOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function hasSingleRunConfig(config: unknown) {
  return Boolean(
    config &&
      typeof config === "object" &&
      !Array.isArray(config) &&
      "singleRun" in config &&
      (config as { singleRun?: unknown }).singleRun === true,
  );
}

export function serializeTask(task: {
  id: string;
  householdId: string;
  title: string;
  description: string | null;
  category: string | null;
  room: string | null;
  color: string;
  estimatedMinutes: number;
  isActive: boolean;
  startsOn: Date;
  endsOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
  recurrenceRule: {
    type: RecurrenceType;
    interval: number;
    weekdays: unknown;
    dayOfMonth: number | null;
    anchorDate: Date;
    dueOffsetDays: number;
    config: unknown;
  };
  assignmentRule: {
    mode: AssignmentMode;
    eligibleMemberIds: unknown;
    fixedMemberId: string | null;
    rotationOrder: unknown;
    fairnessWindowDays: number | null;
    rebalanceOnMemberAbsence: boolean;
    lockAssigneeAfterGeneration: boolean;
  };
}) {
  return {
    id: task.id,
    householdId: task.householdId,
    title: task.title,
    description: task.description,
    category: task.category,
    room: task.room,
    color: task.color,
    estimatedMinutes: task.estimatedMinutes,
    isActive: task.isActive,
    startsOn: task.startsOn.toISOString(),
    endsOn: task.endsOn?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    recurrence: {
      type: task.recurrenceRule.type,
      interval: task.recurrenceRule.interval,
      weekdays: parseNumberArray(task.recurrenceRule.weekdays),
      dayOfMonth: task.recurrenceRule.dayOfMonth,
      anchorDate: task.recurrenceRule.anchorDate.toISOString(),
      dueOffsetDays: task.recurrenceRule.dueOffsetDays,
      oneTime: hasSingleRunConfig(task.recurrenceRule.config),
    },
    assignment: {
      mode: task.assignmentRule.mode,
      eligibleMemberIds: parseStringArray(task.assignmentRule.eligibleMemberIds),
      fixedMemberId: task.assignmentRule.fixedMemberId,
      rotationOrder: parseStringArray(task.assignmentRule.rotationOrder),
      fairnessWindowDays: task.assignmentRule.fairnessWindowDays,
      rebalanceOnMemberAbsence: task.assignmentRule.rebalanceOnMemberAbsence,
      lockAssigneeAfterGeneration: task.assignmentRule.lockAssigneeAfterGeneration,
    },
  };
}

export function serializeOccurrence(occurrence: {
  id: string;
  householdId: string;
  taskTemplateId: string;
  scheduledDate: Date;
  dueDate: Date;
  assignedMemberId: string | null;
  status: string;
  completedAt: Date | null;
  actualMinutes: number | null;
  notes: string | null;
  isManuallyModified: boolean;
  taskTemplate: {
    title: string;
    color: string;
    estimatedMinutes: number;
  };
  assignedMember: {
    id: string;
    displayName: string;
    color: string;
  } | null;
}) {
  return {
    id: occurrence.id,
    householdId: occurrence.householdId,
    taskTemplateId: occurrence.taskTemplateId,
    scheduledDate: occurrence.scheduledDate.toISOString(),
    dueDate: occurrence.dueDate.toISOString(),
    assignedMemberId: occurrence.assignedMemberId,
    status: occurrence.status,
    completedAt: occurrence.completedAt?.toISOString() ?? null,
    actualMinutes: occurrence.actualMinutes,
    notes: occurrence.notes,
    isManuallyModified: occurrence.isManuallyModified,
    task: {
      title: occurrence.taskTemplate.title,
      color: occurrence.taskTemplate.color,
      estimatedMinutes: occurrence.taskTemplate.estimatedMinutes,
    },
    assignedMember: occurrence.assignedMember,
  };
}

export function normalizeAssignmentMembers(params: {
  activeMembers: ActiveMember[];
  eligibleMemberIds?: string[];
  rotationOrder?: string[];
}) {
  const activeMemberIds = new Set(params.activeMembers.map((member) => member.id));
  const fallbackOrder = params.activeMembers.map((member) => member.id);
  const eligibleMemberIds = (params.eligibleMemberIds?.length ? params.eligibleMemberIds : fallbackOrder).filter(
    (memberId) => activeMemberIds.has(memberId),
  );

  if (!eligibleMemberIds.length) {
    throw new Error("No eligible members available for integration task.");
  }

  const rotationOrder = (
    params.rotationOrder?.length ? params.rotationOrder : eligibleMemberIds
  ).filter((memberId) => eligibleMemberIds.includes(memberId));

  return {
    eligibleMemberIds,
    rotationOrder: rotationOrder.length ? rotationOrder : eligibleMemberIds,
  };
}

export function toOpenClawIntegrationSettingsSnapshot(
  integration: HouseholdIntegration | null,
  householdId?: string,
): OpenClawIntegrationSettingsSnapshot {
  return {
    householdId: integration?.householdId ?? householdId ?? "",
    provider: "mcp_openclaw",
    isEnabled: integration?.isEnabled ?? false,
    serverUrl: integration?.serverUrl ?? null,
    clientLabel: integration?.clientLabel ?? null,
    apiKeyPreview: integration?.apiKeyPreview ?? null,
    hasApiKey: Boolean(integration?.apiKeyHash),
    updatedAt: integration?.updatedAt?.toISOString() ?? null,
  };
}
