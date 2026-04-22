import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeNextPath, redirectTo } from "@/lib/request";
import { completeOccurrence } from "@/lib/scheduling/service";
import { occurrenceActionSchema } from "@/lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const formData = await request.formData();
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

  const parsed = occurrenceActionSchema.safeParse({
    occurrenceId: id,
    memberId: String(formData.get("memberId") || membership.id),
    actualMinutes: formData.get("actualMinutes") || undefined,
    notes: formData.get("notes") || undefined,
  });
  const nextPath = normalizeNextPath(formData.get("nextPath")?.toString());

  await completeOccurrence({
    occurrenceId: id,
    actorMemberId: parsed.success ? parsed.data.memberId : membership.id,
    actualMinutes: parsed.success ? parsed.data.actualMinutes : undefined,
    notes: parsed.success ? parsed.data.notes : undefined,
  });

  return redirectTo(request, nextPath ?? `/app?household=${occurrence.householdId}`);
}
