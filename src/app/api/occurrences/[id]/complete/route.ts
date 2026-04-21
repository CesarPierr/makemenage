import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/request";
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

  await completeOccurrence({
    occurrenceId: id,
    actorMemberId: String((await request.formData()).get("memberId") || membership.id),
  });

  return redirectTo(request, `/app?household=${occurrence.householdId}`);
}
