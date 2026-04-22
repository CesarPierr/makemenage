import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeNextPath, redirectTo } from "@/lib/request";
import { skipOccurrence } from "@/lib/scheduling/service";
import { occurrenceActionSchema } from "@/lib/validation";

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
  const nextPath = normalizeNextPath(formData.get("nextPath")?.toString());
  const parsed = occurrenceActionSchema.safeParse({
    occurrenceId: id,
    memberId: String(formData.get("memberId") || membership.id),
    notes: formData.get("notes") || undefined,
  });

  await skipOccurrence({
    occurrenceId: id,
    actorMemberId: parsed.success ? parsed.data.memberId : membership.id,
    notes: parsed.success ? parsed.data.notes : undefined,
  });

  return redirectTo(request, nextPath ?? `/app?household=${occurrence.householdId}`);
}
