import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { canManageHousehold } from "@/lib/households";
import { db } from "@/lib/db";

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
  const eligibleMemberIds = formData.getAll("eligibleMemberIds").map(String).filter(Boolean);
  const assignmentMode = String(formData.get("assignmentMode"));

  const membership = await db.householdMember.findFirst({
    where: {
      householdId,
      userId: user.id,
    },
  });

  if (!membership || !canManageHousehold(membership.role) || !eligibleMemberIds.length) {
    return NextResponse.redirect(new URL(`/app?household=${householdId}`, request.url));
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
      anchorDate: new Date(String(formData.get("startsOn"))),
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
      estimatedMinutes: Number(formData.get("estimatedMinutes") ?? 30),
      priority: 2,
      startsOn: new Date(String(formData.get("startsOn"))),
      recurrenceRuleId: recurrenceRule.id,
      assignmentRuleId: assignmentRule.id,
      createdByMemberId: membership.id,
    },
  });

  return NextResponse.redirect(new URL(`/app?household=${householdId}`, request.url));
}
