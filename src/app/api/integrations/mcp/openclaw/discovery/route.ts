import { NextResponse } from "next/server";

import { authorizeHouseholdIntegrationRequest, readIntegrationHouseholdId } from "@/lib/integrations/auth";
import { buildOpenClawDiscovery } from "@/lib/integrations/openclaw";
import { integrationDiscoveryQuerySchema } from "@/lib/integrations/validation";

export async function GET(request: Request) {
  const householdId = readIntegrationHouseholdId(request);
  const parsed = integrationDiscoveryQuerySchema.safeParse({ householdId });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_household",
        message: "A valid householdId is required for discovery.",
      },
      { status: 400 },
    );
  }

  const auth = await authorizeHouseholdIntegrationRequest(request, parsed.data.householdId);

  if (!auth.ok) {
    return NextResponse.json(
      {
        error: auth.reason,
        message: "A valid integration key is required to access the OpenClaw discovery endpoint.",
      },
      { status: auth.reason === "missing_key" ? 401 : 403 },
    );
  }

  const discovery = await buildOpenClawDiscovery(request, parsed.data.householdId);

  if (!discovery) {
    return NextResponse.json(
      {
        error: "household_not_found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(discovery);
}
