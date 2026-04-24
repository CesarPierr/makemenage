import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logError } from "@/lib/logger";
import { TASK_TEMPLATE_PACKS } from "@/lib/task-templates";
import { canManageHousehold } from "@/lib/households";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser();
    const { id: householdId } = await params;

    // Verify membership and permissions
    const membership = await db.householdMember.findFirst({
      where: { userId: user.id, householdId },
    });
    if (!membership || !canManageHousehold(membership.role)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json() as { packId: string };
    const pack = TASK_TEMPLATE_PACKS.find((p) => p.id === body.packId);
    if (!pack) return NextResponse.json({ error: "Pack introuvable" }, { status: 404 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const created = await Promise.all(
      pack.tasks.map(async (task) => {
        const [recurrenceRule, assignmentRule] = await Promise.all([
          db.recurrenceRule.create({
            data: {
              type: task.recurrenceType,
              interval: task.recurrenceInterval,
              anchorDate: today,
            },
          }),
          db.assignmentRule.create({
            data: {
              mode: "round_robin",
              eligibleMemberIds: [],
            },
          }),
        ]);

        return db.taskTemplate.create({
          data: {
            householdId,
            title: task.title,
            room: task.room,
            estimatedMinutes: task.estimatedMinutes,
            recurrenceRuleId: recurrenceRule.id,
            assignmentRuleId: assignmentRule.id,
            createdByMemberId: membership.id,
            startsOn: today,
          },
        });
      }),
    );

    return NextResponse.json({ created: created.length });
  } catch (err) {
    logError("tasks.bulk", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
