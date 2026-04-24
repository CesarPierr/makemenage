import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDataRequest, normalizeNextPath, redirectTo } from "@/lib/request";
import { reassignOccurrence } from "@/lib/scheduling/service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const dataRequest = isDataRequest(request);
  const user = await requireUser();
  const { id } = await params;
  const occurrence = await db.taskOccurrence.findUnique({
    where: { id },
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

  const formData = await request.formData();
  const assignedMemberId = formData.get("assignedMemberId")?.toString();
  const nextPath = normalizeNextPath(formData.get("nextPath")?.toString());

  if (!assignedMemberId) {
    if (dataRequest) {
      return NextResponse.json({ error: "Membre manquant." }, { status: 400 });
    }

    return redirectTo(request, nextPath ?? `/app?household=${occurrence.householdId}`);
  }

  await reassignOccurrence({
    occurrenceId: id,
    actorMemberId: String(formData.get("memberId") || membership.id),
    assignedMemberId,
  });

  const destination = nextPath ?? `/app?household=${occurrence.householdId}`;

  if (dataRequest) {
    return NextResponse.json({ ok: true, redirectTo: destination });
  }

  return redirectTo(request, destination);
}
