import { NextResponse } from "next/server";

import { authorizeHouseholdIntegrationRequest, readIntegrationHouseholdId } from "@/lib/integrations/auth";
import { rebalanceOpenClawHousehold } from "@/lib/integrations/openclaw";
import { integrationRebalanceSchema } from "@/lib/integrations/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        error: "invalid_json",
      },
      { status: 400 },
    );
  }

  const householdId = readIntegrationHouseholdId(request, "householdId" in body ? String(body.householdId) : null);
  const parsed = integrationRebalanceSchema.safeParse({
    ...body,
    householdId,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_payload",
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

  const result = await rebalanceOpenClawHousehold(parsed.data);

  return NextResponse.json({
    result,
  });
}
