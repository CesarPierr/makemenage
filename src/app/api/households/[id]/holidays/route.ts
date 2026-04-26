import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { declareHoliday } from "@/lib/holidays";
import { isDataRequest, redirectTo } from "@/lib/request";
import { parseDateInput } from "@/lib/date-input";

const schema = z.object({
  startDate: z.preprocess((value) => parseDateInput(String(value ?? "")), z.date()),
  endDate: z.preprocess((value) => parseDateInput(String(value ?? "")), z.date()),
  label: z.string().max(60).optional(),
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const dataRequest = isDataRequest(request);
  const user = await requireUser();
  const { id: householdId } = await params;

  const membership = await db.householdMember.findFirst({
    where: { userId: user.id, householdId },
  });

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    if (dataRequest) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    return redirectTo(request, `/app/settings/holidays?household=${householdId}`);
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    label: formData.get("label") || undefined,
  });

  if (!parsed.success) {
    if (dataRequest) {
      return NextResponse.json({ error: "Dates invalides." }, { status: 400 });
    }
    return redirectTo(request, `/app/settings/holidays?household=${householdId}&error=invalid`);
  }

  if (parsed.data.endDate < parsed.data.startDate) {
    if (dataRequest) {
      return NextResponse.json({ error: "Date de fin antérieure à la date de début." }, { status: 400 });
    }
    return redirectTo(request, `/app/settings/holidays?household=${householdId}&error=order`);
  }

  const result = await declareHoliday({
    householdId,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    label: parsed.data.label,
    actorMemberId: membership.id,
  });

  if (dataRequest) {
    return NextResponse.json({ ok: true, ...result });
  }

  return redirectTo(request, `/app/settings/holidays?household=${householdId}&shifted=${result.shiftedCount}`);
}
