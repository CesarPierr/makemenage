import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageHousehold } from "@/lib/households";
import { redirectTo } from "@/lib/request";
import { syncHouseholdOccurrences } from "@/lib/scheduling/service";
import { absenceSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const fallbackHouseholdId = String(formData.get("householdId") || "");
  const parsed = absenceSchema.safeParse({
    memberId: formData.get("memberId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    const suffix = fallbackHouseholdId ? `?household=${fallbackHouseholdId}&panel=planning&absence=invalid` : "?panel=planning&absence=invalid";
    return redirectTo(request, `/app/settings${suffix}`);
  }

  const target = await db.householdMember.findUnique({
    where: { id: parsed.data.memberId },
  });

  if (!target) {
    return redirectTo(request, "/app/settings?panel=planning&absence=invalid");
  }

  const membership = await db.householdMember.findFirst({
    where: {
      householdId: target.householdId,
      userId: user.id,
    },
  });

  if (!membership || !canManageHousehold(membership.role)) {
    return redirectTo(request, "/app");
  }

  await db.memberAvailability.create({
    data: {
      memberId: parsed.data.memberId,
      type: "date_range_absence",
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      notes: parsed.data.notes,
    },
  });

  await syncHouseholdOccurrences(target.householdId, {
    forceOverwriteManual: true,
  });

  return redirectTo(request, `/app/settings?household=${target.householdId}&panel=planning&absence=saved`);
}
