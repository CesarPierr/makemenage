import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/request";
import { reassignOccurrence } from "@/lib/scheduling/service";

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
  const assignedMemberId = formData.get("assignedMemberId")?.toString();

  if (!assignedMemberId) {
    return redirectTo(request, `/app?household=${occurrence.householdId}`);
  }

  await reassignOccurrence({
    occurrenceId: id,
    actorMemberId: String(formData.get("memberId") || membership.id),
    assignedMemberId,
  });

  return redirectTo(request, `/app?household=${occurrence.householdId}`);
}
