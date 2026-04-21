import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { canManageHousehold } from "@/lib/households";
import { db } from "@/lib/db";
import { memberSchema } from "@/lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const membership = await db.householdMember.findFirst({
    where: {
      householdId: id,
      userId: user.id,
    },
  });

  if (!membership || !canManageHousehold(membership.role)) {
    return NextResponse.redirect(new URL(`/app/settings?household=${id}`, request.url), 303);
  }

  const formData = await request.formData();
  const parsed = memberSchema.safeParse({
    householdId: id,
    displayName: formData.get("displayName"),
    role: formData.get("role"),
    color: formData.get("color"),
    weeklyCapacityMinutes: formData.get("weeklyCapacityMinutes") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL(`/app/settings?household=${id}`, request.url), 303);
  }

  await db.householdMember.create({
    data: parsed.data,
  });

  return NextResponse.redirect(new URL(`/app/settings?household=${id}`, request.url), 303);
}
