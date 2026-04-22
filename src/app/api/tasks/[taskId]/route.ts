import { startOfDay } from "date-fns";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageHousehold } from "@/lib/households";
import { redirectTo } from "@/lib/request";
import { syncHouseholdOccurrences } from "@/lib/scheduling/service";
import { taskTemplateSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const user = await requireUser();
  const { taskId } = await params;
  const formData = await request.formData();
  
  const householdId = String(formData.get("householdId"));
  const method = formData.get("_method");

  if (method === "DELETE") {
    const deleteManual = formData.get("deleteManual") === "on";

    const membership = await db.householdMember.findFirst({
      where: {
        householdId,
        userId: user.id,
      },
    });

    if (!membership || !canManageHousehold(membership.role)) {
      return redirectTo(request, `/app/my-tasks?household=${householdId}#administration`);
    }

    const task = await db.taskTemplate.findFirst({
      where: { id: taskId, householdId },
    });

    if (!task) {
      return redirectTo(request, `/app/my-tasks?household=${householdId}#administration`);
    }

    await db.taskTemplate.update({
      where: { id: taskId },
      data: { isActive: false },
    });

    // Cancel future occurrences
    const conditions: {
      taskTemplateId: string;
      status: { in: ["planned", "due", "overdue", "rescheduled"] };
      scheduledDate: { gte: Date };
      isManuallyModified?: boolean;
    } = {
      taskTemplateId: taskId,
      status: { in: ["planned", "due", "overdue", "rescheduled"] },
      scheduledDate: { gte: startOfDay(new Date()) },
    };

    if (!deleteManual) {
      conditions.isManuallyModified = false;
    }

    await db.taskOccurrence.updateMany({
      where: conditions,
      data: { status: "cancelled" },
    });

    return redirectTo(request, `/app/my-tasks?household=${householdId}#administration`);
  }

  // Handle PUT as POST default
  const forceOverwriteManual = formData.get("forceOverwriteManual") === "on";
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

  if (!parsedTask.success || !eligibleMemberIds.length) {
    return redirectTo(request, `/app/my-tasks?household=${householdId}#administration`);
  }

  const membership = await db.householdMember.findFirst({
    where: {
      householdId,
      userId: user.id,
    },
  });

  if (!membership || !canManageHousehold(membership.role)) {
    return redirectTo(request, `/app/my-tasks?household=${householdId}#administration`);
  }

  const task = await db.taskTemplate.findFirst({
    where: { id: taskId, householdId },
    include: { recurrenceRule: true, assignmentRule: true },
  });

  if (!task) {
    return redirectTo(request, `/app/my-tasks?household=${householdId}#administration`);
  }

  await db.recurrenceRule.update({
    where: { id: task.recurrenceRuleId },
    data: {
      type: parsedTask.data.recurrence.type,
      interval: parsedTask.data.recurrence.interval,
      anchorDate: parsedTask.data.recurrence.anchorDate,
    },
  });

  await db.assignmentRule.update({
    where: { id: task.assignmentRuleId },
    data: {
      mode: parsedTask.data.assignment.mode,
      eligibleMemberIds: parsedTask.data.assignment.eligibleMemberIds,
      fixedMemberId: parsedTask.data.assignment.mode === "fixed" ? parsedTask.data.assignment.eligibleMemberIds[0] : null,
      rotationOrder: parsedTask.data.assignment.eligibleMemberIds,
    },
  });

  await db.taskTemplate.update({
    where: { id: taskId },
    data: {
      title: parsedTask.data.title,
      description: parsedTask.data.description,
      category: parsedTask.data.category,
      room: parsedTask.data.room,
      color: parsedTask.data.color,
      estimatedMinutes: parsedTask.data.estimatedMinutes,
      startsOn: parsedTask.data.startsOn,
    },
  });

  await syncHouseholdOccurrences(householdId, { taskId, forceOverwriteManual });

  return redirectTo(request, `/app/my-tasks?household=${householdId}#administration`);
}
