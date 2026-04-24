import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const user = await requireUser();
  const { taskId } = await params;

  const task = await db.taskTemplate.findFirst({
    where: {
      id: taskId,
      household: {
        members: { some: { userId: user.id, isActive: true } },
      },
    },
    include: {
      recurrenceRule: true,
      assignmentRule: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const recentRuns = await db.taskOccurrence.findMany({
    where: {
      taskTemplateId: taskId,
      status: { in: ["completed", "skipped"] },
    },
    include: {
      completedByMember: { select: { displayName: true, color: true } },
    },
    orderBy: { scheduledDate: "desc" },
    take: 5,
  });

  return NextResponse.json({
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      room: task.room,
      color: task.color,
      estimatedMinutes: task.estimatedMinutes,
      startsOn: task.startsOn,
      endsOn: task.endsOn,
      recurrenceRule: {
        type: task.recurrenceRule.type,
        interval: task.recurrenceRule.interval,
        weekdays: task.recurrenceRule.weekdays,
        dayOfMonth: task.recurrenceRule.dayOfMonth,
        anchorDate: task.recurrenceRule.anchorDate,
        dueOffsetDays: task.recurrenceRule.dueOffsetDays,
        config: task.recurrenceRule.config,
      },
      assignmentRule: {
        mode: task.assignmentRule.mode,
        eligibleMemberIds: task.assignmentRule.eligibleMemberIds,
      },
    },
    recentRuns: recentRuns.map((run) => ({
      id: run.id,
      scheduledDate: run.scheduledDate,
      completedAt: run.completedAt,
      status: run.status,
      actualMinutes: run.actualMinutes,
      notes: run.notes,
      completedBy: run.completedByMember
        ? { displayName: run.completedByMember.displayName, color: run.completedByMember.color }
        : null,
    })),
  });
}
