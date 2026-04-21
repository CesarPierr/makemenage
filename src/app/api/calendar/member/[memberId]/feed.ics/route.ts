import { NextResponse } from "next/server";
import ical from "ical-generator";

import { requireUser } from "@/lib/auth";
import { getCurrentHouseholdContext } from "@/lib/households";

type Params = {
  params: Promise<{ memberId: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser();
  const { memberId } = await params;
  const url = new URL(request.url);
  const householdId = url.searchParams.get("household");
  const context = await getCurrentHouseholdContext(user.id, householdId);

  if (!context) {
    return new NextResponse("No household", { status: 404 });
  }

  const targetMember = context.household.members.find((member) => member.id === memberId);

  if (!targetMember) {
    return new NextResponse("No member", { status: 404 });
  }

  const calendar = ical({
    name: `MakeMenage - ${targetMember.displayName}`,
    timezone: context.household.timezone,
  });

  context.occurrences
    .filter((occurrence) => occurrence.assignedMemberId === memberId)
    .forEach((occurrence) => {
      calendar.createEvent({
        start: occurrence.scheduledDate,
        end: occurrence.dueDate,
        summary: occurrence.taskTemplate.title,
        description: `Assigné à ${targetMember.displayName} · ${occurrence.status}`,
      });
    });

  return new NextResponse(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${targetMember.displayName}.ics"`,
    },
  });
}
