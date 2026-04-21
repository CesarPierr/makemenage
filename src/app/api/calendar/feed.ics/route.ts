import { NextResponse } from "next/server";
import ical from "ical-generator";

import { requireUser } from "@/lib/auth";
import { getCurrentHouseholdContext } from "@/lib/households";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const householdId = url.searchParams.get("household");
  const context = await getCurrentHouseholdContext(user.id, householdId);

  if (!context) {
    return new NextResponse("No household", { status: 404 });
  }

  const calendar = ical({
    name: `MakeMenage - ${context.household.name}`,
    timezone: context.household.timezone,
  });

  context.occurrences.forEach((occurrence) => {
    calendar.createEvent({
      start: occurrence.scheduledDate,
      end: occurrence.dueDate,
      summary: occurrence.taskTemplate.title,
      description: `Assigné à ${occurrence.assignedMember?.displayName ?? "non attribué"} · ${occurrence.status}`,
    });
  });

  return new NextResponse(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${context.household.name}.ics"`,
    },
  });
}
