import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { parseDateInput } from "@/lib/date-input";
import { db } from "@/lib/db";
import { canManageHousehold } from "@/lib/households";
import { redirectTo } from "@/lib/request";
import { syncHouseholdOccurrences } from "@/lib/scheduling/service";
import { taskTemplateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const householdId = url.searchParams.get("household");

  const membership = await db.householdMember.findFirst({
    where: {
      userId: user.id,
      ...(householdId ? { householdId } : {}),
    },
  });

  if (!membership) {
    return NextResponse.json([]);
  }

  const tasks = await db.taskTemplate.findMany({
    where: {
      householdId: membership.householdId,
    },
    include: {
      recurrenceRule: true,
      assignmentRule: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const householdId = String(formData.get("householdId"));
  const requestedEligibleMemberIds = formData.getAll("eligibleMemberIds").map(String).filter(Boolean);
  const assignmentMode = String(formData.get("assignmentMode"));
  const householdMembers = await db.householdMember.findMany({
    where: {
      householdId,
      isActive: true,
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  const defaultEligibleMemberIds = householdMembers.map((member) => member.id);
  const eligibleMemberIds = requestedEligibleMemberIds.length
    ? requestedEligibleMemberIds
    : defaultEligibleMemberIds;
  const parsedTask = taskTemplateSchema.safeParse({
    householdId,
    title: formData.get("title"),
    category: formData.get("category") || undefined,
    room: formData.get("room") || undefined,
    color: formData.get("color") || undefined,
    estimatedMinutes: formData.get("estimatedMinutes"),
    startsOn: formData.get("startsOn"),
    recurrence: {
      type: formData.get("recurrenceType"),
      interval: formData.get("interval"),
      anchorDate: formData.get("startsOn"),
      dueOffsetDays: 0,
    },
    assignment: {
      mode: assignmentMode,
      eligibleMemberIds,
      rotationOrder: eligibleMemberIds,
      fairnessWindowDays: 14,
      rebalanceOnMemberAbsence: true,
      lockAssigneeAfterGeneration: true,
    },
  });

  const membership = await db.householdMember.findFirst({
    where: {
      householdId,
      userId: user.id,
    },
  });

  if (!membership || !canManageHousehold(membership.role) || !eligibleMemberIds.length) {
    return redirectTo(request, `/app?household=${householdId}`);
  }

  if (!parsedTask.success) {
    return redirectTo(request, `/app?household=${householdId}`);
  }

  const recurrenceRule = await db.recurrenceRule.create({
    data: {
      type: String(formData.get("recurrenceType")) as
        | "daily"
        | "every_x_days"
        | "weekly"
        | "every_x_weeks"
        | "monthly_simple",
      interval: Number(formData.get("interval") ?? 1),
      anchorDate: parseDateInput(String(formData.get("startsOn"))),
      dueOffsetDays: 0,
    },
  });

  const assignmentRule = await db.assignmentRule.create({
    data: {
      mode: assignmentMode as
        | "fixed"
        | "manual"
        | "strict_alternation"
        | "round_robin"
        | "least_assigned_count"
        | "least_assigned_minutes",
      eligibleMemberIds,
      fixedMemberId: assignmentMode === "fixed" ? eligibleMemberIds[0] : null,
      rotationOrder: eligibleMemberIds,
      fairnessWindowDays: 14,
      rebalanceOnMemberAbsence: true,
      lockAssigneeAfterGeneration: true,
    },
  });

  await db.taskTemplate.create({
    data: {
      householdId,
      title: String(formData.get("title")),
      description: (formData.get("description")?.toString() || null) ?? null,
      category: (formData.get("category")?.toString() || null) ?? null,
      room: (formData.get("room")?.toString() || null) ?? null,
      color: parsedTask.data.color,
      estimatedMinutes: parsedTask.data.estimatedMinutes,
      priority: 2,
      startsOn: parsedTask.data.startsOn,
      recurrenceRuleId: recurrenceRule.id,
      assignmentRuleId: assignmentRule.id,
      createdByMemberId: membership.id,
    },
  });

  await syncHouseholdOccurrences(householdId);

  return redirectTo(request, `/app?household=${householdId}`);
}
