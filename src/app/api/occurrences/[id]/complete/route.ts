import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDataRequest, normalizeNextPath, redirectTo } from "@/lib/request";
import { completeOccurrence } from "@/lib/scheduling/service";
import { occurrenceActionSchema } from "@/lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const dataRequest = isDataRequest(request);
  const user = await requireUser();
  const { id } = await params;
  const formData = await request.formData();
  const occurrence = await db.taskOccurrence.findUnique({
    where: { id },
    include: { household: true },
  });

  if (!occurrence) {
    if (dataRequest) {
      return NextResponse.json({ error: "Occurrence introuvable." }, { status: 404 });
    }
    return redirectTo(request, "/app");
  }

  const membership = await db.householdMember.findFirst({
    where: {
      householdId: occurrence.householdId,
      userId: user.id,
    },
  });

  if (!membership) {
    if (dataRequest) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    return redirectTo(request, "/app");
  }

  const parsed = occurrenceActionSchema.safeParse({
    occurrenceId: id,
    memberId: String(formData.get("memberId") || membership.id),
    actualMinutes: formData.get("actualMinutes") || undefined,
    notes: formData.get("notes") || undefined,
    wasCompletedAlone: formData.get("wasCompletedAlone") === "on",
  });
  const nextPath = normalizeNextPath(formData.get("nextPath")?.toString());

  // Future occurrences always realign from the actual completion date — no user toggle.
  await completeOccurrence({
    occurrenceId: id,
    actorMemberId: parsed.success ? parsed.data.memberId : membership.id,
    actualMinutes: parsed.success ? parsed.data.actualMinutes : undefined,
    notes: parsed.success ? parsed.data.notes : undefined,
    wasCompletedAlone: parsed.success ? parsed.data.wasCompletedAlone : false,
  });

  const destination = nextPath ?? `/app?household=${occurrence.householdId}`;

  if (dataRequest) {
    return NextResponse.json({ ok: true, redirectTo: destination });
  }

  return redirectTo(request, destination);
}
