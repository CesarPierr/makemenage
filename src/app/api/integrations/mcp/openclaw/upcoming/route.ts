import { NextResponse } from "next/server";

import { authorizeHouseholdIntegrationRequest, readIntegrationHouseholdId } from "@/lib/integrations/auth";
import { listOpenClawUpcoming } from "@/lib/integrations/openclaw";
import { integrationUpcomingQuerySchema } from "@/lib/integrations/validation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const householdId = readIntegrationHouseholdId(request, url.searchParams.get("householdId"));
  const parsed = integrationUpcomingQuerySchema.safeParse({
    householdId,
    memberId: url.searchParams.get("memberId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    includeCompleted: url.searchParams.get("includeCompleted") === "1",
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_query",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const auth = await authorizeHouseholdIntegrationRequest(request, parsed.data.householdId);

  if (!auth.ok) {
    return NextResponse.json(
      {
        error: auth.reason,
      },
      { status: auth.reason === "missing_key" ? 401 : 403 },
    );
  }

  const upcoming = await listOpenClawUpcoming(parsed.data);

  return NextResponse.json({
    upcoming,
  });
}
