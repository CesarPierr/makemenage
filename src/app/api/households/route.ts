import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/request";
import { householdSchema } from "@/lib/validation";

export async function GET() {
  const user = await requireUser();
  const households = await db.householdMember.findMany({
    where: { userId: user.id },
    include: { household: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    households.map((membership) => ({
      role: membership.role,
      household: membership.household,
    })),
  );
}

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const parsed = householdSchema.safeParse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) {
    return redirectTo(request, "/app?onboarding=1");
  }

  const household = await db.household.create({
    data: {
      name: parsed.data.name,
      timezone: parsed.data.timezone,
      createdByUserId: user.id,
      members: {
        create: {
          userId: user.id,
          displayName: user.displayName,
          color: "#E86A33",
          role: "owner",
        },
      },
    },
  });

  return redirectTo(request, `/app?household=${household.id}`);
}
