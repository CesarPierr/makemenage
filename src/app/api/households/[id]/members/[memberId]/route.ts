import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageHousehold } from "@/lib/households";
import { redirectTo } from "@/lib/request";
import { memberSchema } from "@/lib/validation";

type Params = {
  params: Promise<{ id: string; memberId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  const { id, memberId } = await params;
  const formData = await request.formData();

  if (formData.get("_method") !== "PUT") {
    return redirectTo(request, `/app/settings?household=${id}`);
  }

  const actorMembership = await db.householdMember.findFirst({
    where: {
      householdId: id,
      userId: user.id,
    },
  });

  const targetMember = await db.householdMember.findFirst({
    where: {
      id: memberId,
      householdId: id,
    },
  });

  if (!actorMembership || !targetMember) {
    return redirectTo(request, `/app/settings?household=${id}`);
  }

  const canManageTarget = canManageHousehold(actorMembership.role);
  const isSelf = targetMember.userId === user.id;

  if (!canManageTarget && !isSelf) {
    return redirectTo(request, `/app/settings?household=${id}`);
  }

  const parsed = memberSchema.safeParse({
    householdId: id,
    displayName: formData.get("displayName"),
    role: canManageTarget ? formData.get("role") : targetMember.role,
    color: formData.get("color"),
    weeklyCapacityMinutes: canManageTarget
      ? formData.get("weeklyCapacityMinutes") || undefined
      : targetMember.weeklyCapacityMinutes ?? undefined,
  });

  if (!parsed.success) {
    return redirectTo(request, `/app/settings?household=${id}&member=invalid`);
  }

  await db.householdMember.update({
    where: { id: targetMember.id },
    data: {
      displayName: parsed.data.displayName,
      color: parsed.data.color,
      role: canManageTarget ? parsed.data.role : targetMember.role,
      weeklyCapacityMinutes: canManageTarget
        ? parsed.data.weeklyCapacityMinutes ?? null
        : targetMember.weeklyCapacityMinutes,
    },
  });

  return redirectTo(request, `/app/settings?household=${id}&member=updated`);
}
