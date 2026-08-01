import { NextResponse } from "next/server";

import { withHousehold } from "@/lib/api";
import { deleteHoliday } from "@/lib/holidays";
import { isDataRequest, redirectTo } from "@/lib/request";
import { syncHouseholdOccurrences } from "@/lib/scheduling/service";

export const POST = withHousehold<{ id: string; holidayId: string }>(
  async ({ request, params }) => {
    await deleteHoliday({ holidayId: params.holidayId, householdId: params.id });
    // Reconcile the recurrence after un-shifting so any freed slots regenerate.
    await syncHouseholdOccurrences(params.id).catch(() => {});

    if (isDataRequest(request)) {
      return NextResponse.json({ ok: true });
    }

    return redirectTo(request, `/app/taches/disponibilites?household=${params.id}&deleted=1`);
  },
  { requireManage: true },
);
