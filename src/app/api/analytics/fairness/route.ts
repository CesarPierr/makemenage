import { NextResponse } from "next/server";

import { buildLoadMetrics } from "@/lib/analytics";
import { requireUser } from "@/lib/auth";
import { getCurrentHouseholdContext } from "@/lib/households";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const householdId = url.searchParams.get("household");
  const context = await getCurrentHouseholdContext(user.id, householdId);

  if (!context) {
    return NextResponse.json({ fairness: [] });
  }

  return NextResponse.json(buildLoadMetrics(context.household.members, context.weekOccurrences).fairness);
}
