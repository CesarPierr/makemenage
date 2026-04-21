import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const householdId = url.searchParams.get("household");
  const memberId = url.searchParams.get("memberId");

  const membership = await db.householdMember.findFirst({
    where: {
      userId: user.id,
      ...(householdId ? { householdId } : {}),
    },
  });

  if (!membership) {
    return NextResponse.json([]);
  }

  const occurrences = await db.taskOccurrence.findMany({
    where: {
      householdId: membership.householdId,
      ...(memberId ? { assignedMemberId: memberId } : {}),
    },
    include: {
      taskTemplate: true,
      assignedMember: true,
    },
    orderBy: {
      scheduledDate: "asc",
    },
  });

  return NextResponse.json(occurrences);
}
