import { z } from "zod";

import { parseDateInput } from "@/lib/date-input";

const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const householdIdSchema = z.string().cuid();
const memberIdSchema = z.string().cuid();

const dateInputSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value;
  }

  return parseDateInput(String(value ?? ""));
}, z.date());

export const integrationSettingsSchema = z.object({
  householdId: householdIdSchema,
  isEnabled: z.boolean().default(false),
  serverUrl: z
    .string()
    .trim()
    .url()
    .max(240)
    .optional()
    .or(z.literal("")),
  clientLabel: z.string().trim().min(2).max(80).optional().or(z.literal("")),
  regenerateKey: z.boolean().default(false),
});

export const integrationTaskDefinitionSchema = z.object({
  householdId: householdIdSchema,
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(280).optional(),
  category: z.string().trim().max(40).optional(),
  room: z.string().trim().max(40).optional(),
  color: colorSchema.default("#D8643D"),
  estimatedMinutes: z.coerce.number().int().min(1).max(480).default(30),
  startsOn: dateInputSchema,
  recurrence: z.object({
    type: z.enum(["daily", "every_x_days", "weekly", "every_x_weeks", "monthly_simple"]),
    interval: z.coerce.number().int().min(1).max(90).default(1),
    weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
    anchorDate: dateInputSchema.optional(),
    dueOffsetDays: z.coerce.number().int().min(0).max(30).default(0),
    oneTime: z.boolean().default(false),
  }),
  assignment: z
    .object({
      mode: z
        .enum([
          "fixed",
          "manual",
          "strict_alternation",
          "round_robin",
          "least_assigned_count",
          "least_assigned_minutes",
        ])
        .default("strict_alternation"),
      eligibleMemberIds: z.array(memberIdSchema).min(1).optional(),
      fixedMemberId: memberIdSchema.optional(),
      rotationOrder: z.array(memberIdSchema).optional(),
      fairnessWindowDays: z.coerce.number().int().min(1).max(90).default(14),
      rebalanceOnMemberAbsence: z.boolean().default(true),
      lockAssigneeAfterGeneration: z.boolean().default(true),
    })
    .default({
      mode: "strict_alternation",
      fairnessWindowDays: 14,
      rebalanceOnMemberAbsence: true,
      lockAssigneeAfterGeneration: true,
    }),
});

export const integrationTaskPatchSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(280).nullable().optional(),
  category: z.string().trim().max(40).nullable().optional(),
  room: z.string().trim().max(40).nullable().optional(),
  color: colorSchema.optional(),
  estimatedMinutes: z.coerce.number().int().min(1).max(480).optional(),
  startsOn: dateInputSchema.optional(),
  forceOverwriteManual: z.boolean().default(false),
  recurrence: z
    .object({
      type: z.enum(["daily", "every_x_days", "weekly", "every_x_weeks", "monthly_simple"]).optional(),
      interval: z.coerce.number().int().min(1).max(90).optional(),
      weekdays: z.array(z.number().int().min(0).max(6)).optional(),
      dayOfMonth: z.coerce.number().int().min(1).max(31).nullable().optional(),
      anchorDate: dateInputSchema.optional(),
      dueOffsetDays: z.coerce.number().int().min(0).max(30).optional(),
      oneTime: z.boolean().optional(),
    })
    .optional(),
  assignment: z
    .object({
      mode: z
        .enum([
          "fixed",
          "manual",
          "strict_alternation",
          "round_robin",
          "least_assigned_count",
          "least_assigned_minutes",
        ])
        .optional(),
      eligibleMemberIds: z.array(memberIdSchema).min(1).optional(),
      fixedMemberId: memberIdSchema.nullable().optional(),
      rotationOrder: z.array(memberIdSchema).optional(),
      fairnessWindowDays: z.coerce.number().int().min(1).max(90).optional(),
      rebalanceOnMemberAbsence: z.boolean().optional(),
      lockAssigneeAfterGeneration: z.boolean().optional(),
    })
    .optional(),
});

export const integrationTaskDeleteSchema = z.object({
  householdId: householdIdSchema,
  deleteManual: z.boolean().default(false),
});

export const integrationUpcomingQuerySchema = z.object({
  householdId: householdIdSchema,
  memberId: memberIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeCompleted: z.boolean().default(false),
});

export const integrationDiscoveryQuerySchema = z.object({
  householdId: householdIdSchema,
});

export const integrationRebalanceSchema = z.object({
  householdId: householdIdSchema,
  taskId: z.string().cuid().optional(),
  forceOverwriteManual: z.boolean().default(false),
  preserveRotationOnSkipOverride: z.boolean().optional(),
});
