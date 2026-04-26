import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteHoliday } from "@/lib/holidays";
import { isDataRequest, redirectTo } from "@/lib/request";

type Params = {
  params: Promise<{ id: string; holidayId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const dataRequest = isDataRequest(request);
  const user = await requireUser();
  const { id: householdId, holidayId } = await params;

  const membership = await db.householdMember.findFirst({
    where: { userId: user.id, householdId },
  });

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    if (dataRequest) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    return redirectTo(request, `/app/settings/holidays?household=${householdId}`);
  }

  await deleteHoliday({ holidayId, householdId });

  if (dataRequest) {
    return NextResponse.json({ ok: true });
  }

  return redirectTo(request, `/app/settings/holidays?household=${householdId}&deleted=1`);
}
