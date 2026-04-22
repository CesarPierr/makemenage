import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createHouseholdInvite } from "@/lib/household-management";
import { canManageHousehold } from "@/lib/households";
import { redirectTo } from "@/lib/request";
import { householdInviteSchema } from "@/lib/validation";

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
    return redirectTo(request, `/app/settings?household=${id}`);
  }

  const formData = await request.formData();
  const parsed = householdInviteSchema.safeParse({
    householdId: id,
    role: formData.get("role") || "member",
    expiresInDays: formData.get("expiresInDays") || 7,
  });

  if (!parsed.success) {
    return redirectTo(request, `/app/settings?household=${id}&invite=invalid`);
  }

  await createHouseholdInvite({
    householdId: id,
    createdByMemberId: membership.id,
    role: parsed.data.role,
    expiresInDays: parsed.data.expiresInDays,
  });

  return redirectTo(request, `/app/settings?household=${id}&invite=created`);
}
