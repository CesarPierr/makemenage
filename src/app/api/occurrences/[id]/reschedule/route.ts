import { requireUser } from "@/lib/auth";
import { parseDateInput } from "@/lib/date-input";
import { db } from "@/lib/db";
import { normalizeNextPath, redirectTo } from "@/lib/request";
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
    return redirectTo(request, "/app");
  }

  const membership = await db.householdMember.findFirst({
    where: {
      householdId: occurrence.householdId,
      userId: user.id,
    },
  });

  if (!membership) {
    return redirectTo(request, "/app");
  }

  const formData = await request.formData();
  const date = formData.get("date")?.toString();
  const nextPath = normalizeNextPath(formData.get("nextPath")?.toString());

  if (!date) {
    return redirectTo(request, nextPath ?? `/app?household=${occurrence.householdId}`);
  }

  await rescheduleOccurrence({
    occurrenceId: id,
    actorMemberId: String(formData.get("memberId") || membership.id),
    scheduledDate: parseDateInput(date),
  });

  return redirectTo(request, nextPath ?? `/app?household=${occurrence.householdId}`);
}
