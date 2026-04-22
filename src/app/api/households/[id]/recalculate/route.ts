import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageHousehold } from "@/lib/households";
import { redirectTo } from "@/lib/request";
import { syncHouseholdOccurrences } from "@/lib/scheduling/service";

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
  const forceOverwriteManual = formData.get("forceOverwriteManual") === "on";

  await syncHouseholdOccurrences(id, { forceOverwriteManual });

  const result = forceOverwriteManual ? "done_overwrite" : "done";
  return redirectTo(request, `/app/settings?household=${id}&rebalance=${result}`);
}
