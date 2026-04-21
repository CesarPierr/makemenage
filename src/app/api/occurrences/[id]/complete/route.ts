import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { completeOccurrence } from "@/lib/scheduling/service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const occurrence = await db.taskOccurrence.findUnique({
    where: { id },
    include: { household: true },
  });

  if (!occurrence) {
    return NextResponse.redirect(new URL("/app", request.url), 303);
  }

  const membership = await db.householdMember.findFirst({
    where: {
      householdId: occurrence.householdId,
      userId: user.id,
    },
  });

  if (!membership) {
    return NextResponse.redirect(new URL("/app", request.url), 303);
  }

  await completeOccurrence({
    occurrenceId: id,
    actorMemberId: String((await request.formData()).get("memberId") || membership.id),
  });

  return NextResponse.redirect(new URL(`/app?household=${occurrence.householdId}`, request.url), 303);
}
