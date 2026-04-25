import { NextResponse } from "next/server";
import type { OccurrenceStatus } from "@prisma/client";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const VALID_STATUSES = new Set<OccurrenceStatus>([
  "planned",
  "due",
  "overdue",
  "completed",
  "skipped",
  "rescheduled",
  "cancelled",
]);

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const householdId = url.searchParams.get("household");
  const memberId = url.searchParams.get("memberId");
  const cursor = url.searchParams.get("cursor");
  const statusParam = url.searchParams.get("status");
  const status = statusParam && VALID_STATUSES.has(statusParam as OccurrenceStatus)
    ? (statusParam as OccurrenceStatus)
    : null;
  const limitParam = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(MAX_LIMIT, limitParam)
    : DEFAULT_LIMIT;

  const membership = await db.householdMember.findFirst({
    where: {
      userId: user.id,
      ...(householdId ? { householdId } : {}),
    },
  });

  if (!membership) {
    return NextResponse.json({ items: [], nextCursor: null });
  }

  const items = await db.taskOccurrence.findMany({
    where: {
      householdId: membership.householdId,
      ...(memberId ? { assignedMemberId: memberId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      taskTemplate: true,
      assignedMember: true,
    },
    orderBy: [
      { scheduledDate: "asc" },
      { id: "asc" },
    ],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({ items: page, nextCursor });
}
