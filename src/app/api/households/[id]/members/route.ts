import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageHousehold } from "@/lib/households";
import { redirectTo } from "@/lib/request";
import { addMemberToExistingAssignments, syncHouseholdOccurrences } from "@/lib/scheduling/service";
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
    return redirectTo(request, `/app/settings/team?household=${id}`);
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
    return redirectTo(request, `/app/settings/team?household=${id}`);
  }

  const createdMember = await db.householdMember.create({
    data: parsed.data,
  });

  const includeInExistingTasks = String(formData.get("includeInExistingTasks") ?? "on") !== "off";

  if (includeInExistingTasks) {
    await addMemberToExistingAssignments({
      householdId: id,
      memberId: createdMember.id,
    });
  } else {
    await syncHouseholdOccurrences(id);
  }

  return redirectTo(request, `/app/settings/team?household=${id}`);
}
