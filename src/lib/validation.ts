import { z } from "zod";

import { parseDateInput } from "@/lib/date-input";

export const registerSchema = z.object({
  displayName: z.string().min(2).max(60),
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const householdSchema = z.object({
  name: z.string().min(2).max(80),
  timezone: z.string().min(2).max(60).default(process.env.DEFAULT_TIMEZONE ?? "Europe/Paris"),
});

export const memberSchema = z.object({
  householdId: z.string().cuid(),
  displayName: z.string().min(2).max(60),
  role: z.enum(["owner", "admin", "member"]).default("member"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#E86A33"),
  weeklyCapacityMinutes: z.coerce.number().int().min(0).max(10080).optional(),
});

export const absenceSchema = z.object({
  memberId: z.string().cuid(),
  startDate: z.preprocess((value) => parseDateInput(String(value ?? "")), z.date()),
  endDate: z.preprocess((value) => parseDateInput(String(value ?? "")), z.date()),
  notes: z.string().max(240).optional(),
}).refine((value) => value.endDate >= value.startDate, {
  message: "endDate must be on or after startDate",
  path: ["endDate"],
});

export const recurrenceSchema = z.object({
  type: z.enum(["daily", "every_x_days", "weekly", "every_x_weeks", "monthly_simple"]),
  interval: z.coerce.number().int().min(1).max(90).default(1),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  anchorDate: z.preprocess((value) => parseDateInput(String(value ?? "")), z.date()),
  dueOffsetDays: z.coerce.number().int().min(0).max(30).default(0),
});

export const assignmentSchema = z.object({
  mode: z.enum([
    "fixed",
    "manual",
    "strict_alternation",
    "round_robin",
    "least_assigned_count",
    "least_assigned_minutes",
  ]),
  eligibleMemberIds: z.array(z.string().cuid()).min(1),
  fixedMemberId: z.string().cuid().optional(),
  rotationOrder: z.array(z.string().cuid()).optional(),
  fairnessWindowDays: z.coerce.number().int().min(1).max(90).default(14),
  rebalanceOnMemberAbsence: z.boolean().default(true),
  lockAssigneeAfterGeneration: z.boolean().default(true),
});

export const taskTemplateSchema = z.object({
  householdId: z.string().cuid(),
  title: z.string().min(2).max(80),
  description: z.string().max(280).optional(),
  category: z.string().max(40).optional(),
  room: z.string().max(40).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#D8643D"),
  estimatedMinutes: z.coerce.number().int().min(1).max(480).default(30),
  priority: z.coerce.number().int().min(1).max(3).default(2),
  startsOn: z.preprocess((value) => parseDateInput(String(value ?? "")), z.date()),
  endsOn: z.preprocess((value) => (value ? parseDateInput(String(value)) : undefined), z.date()).optional(),
  recurrence: recurrenceSchema,
  assignment: assignmentSchema,
});

export const occurrenceActionSchema = z.object({
  occurrenceId: z.string().cuid(),
  memberId: z.string().cuid().optional(),
  notes: z.string().max(280).optional(),
  date: z.preprocess((value) => (value ? parseDateInput(String(value)) : undefined), z.date()).optional(),
  actualMinutes: z.coerce.number().int().min(0).max(480).optional(),
  shiftFutureOccurrences: z.coerce.boolean().optional(),
  wasCompletedAlone: z.coerce.boolean().optional(),
});

export const householdInviteSchema = z.object({
  householdId: z.string().cuid(),
  role: z.enum(["owner", "admin", "member"]).default("member"),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

export const redeemInviteSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6)
    .max(24)
    .transform((value) => value.toUpperCase()),
});
