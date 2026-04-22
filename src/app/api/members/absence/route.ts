import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirectTo } from "@/lib/request";
import { syncHouseholdOccurrences } from "@/lib/scheduling/service";
import { absenceSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const parsed = absenceSchema.safeParse({
    memberId: formData.get("memberId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return redirectTo(request, "/app/settings");
  }

  const target = await db.householdMember.findUnique({
    where: { id: parsed.data.memberId },
  });

  if (!target) {
    return redirectTo(request, "/app/settings");
  }

  const membership = await db.householdMember.findFirst({
    where: {
      householdId: target.householdId,
      userId: user.id,
    },
  });

  if (!membership) {
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

  await syncHouseholdOccurrences(target.householdId);

  return redirectTo(request, `/app/settings?household=${target.householdId}`);
}
