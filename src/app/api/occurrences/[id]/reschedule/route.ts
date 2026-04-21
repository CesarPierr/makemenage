import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { parseDateInput } from "@/lib/date-input";
import { db } from "@/lib/db";
import { rescheduleOccurrence } from "@/lib/scheduling/service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const occurrence = await db.taskOccurrence.findUnique({
    where: { id },
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

  const formData = await request.formData();
  const date = formData.get("date")?.toString();

  if (!date) {
    return NextResponse.redirect(new URL(`/app?household=${occurrence.householdId}`, request.url), 303);
  }

  await rescheduleOccurrence({
    occurrenceId: id,
    actorMemberId: String(formData.get("memberId") || membership.id),
    scheduledDate: parseDateInput(date),
  });

  return NextResponse.redirect(new URL(`/app?household=${occurrence.householdId}`, request.url), 303);
}
