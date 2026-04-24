import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = request.nextUrl;
    const householdId = searchParams.get("household");
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const filter = searchParams.get("filter");

    if (!householdId) return NextResponse.json({ error: "household requis" }, { status: 400 });

    // Verify membership
    const membership = await db.householdMember.findFirst({
      where: { userId: user.id, householdId },
    });
    if (!membership) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const actionTypeFilter = filter === "completed" || filter === "skipped" || filter === "rescheduled" || filter === "edited"
      ? filter
      : undefined;

    const logs = await db.occurrenceActionLog.findMany({
      where: {
        occurrence: { householdId },
        actionType: { not: "created" },
        ...(actionTypeFilter ? { actionType: actionTypeFilter } : {}),
        ...(cursor ? { createdAt: { lt: (await db.occurrenceActionLog.findUnique({ where: { id: cursor } }))?.createdAt ?? new Date() } } : {}),
      },
      include: {
        occurrence: { include: { taskTemplate: true } },
        actorMember: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // fetch one extra to know if there are more
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;

    return NextResponse.json({
      logs: items.map((log) => ({
        id: log.id,
        actionType: log.actionType,
        createdAt: log.createdAt.toISOString(),
        actorName: log.actorMember?.displayName ?? "Système",
        taskTitle: log.occurrence.taskTemplate.title,
        previousValues: log.previousValues,
        newValues: log.newValues,
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    });
  } catch (err) {
    logError("history.get", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
