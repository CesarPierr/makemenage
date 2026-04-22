import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/request";
import { reopenOccurrence } from "@/lib/scheduling/service";

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

  await reopenOccurrence({
    occurrenceId: id,
    actorMemberId: String(formData.get("memberId") || membership.id),
    notes: formData.get("notes")?.toString() || undefined,
  });

  return redirectTo(request, `/app?household=${occurrence.householdId}`);
}
