import { NextResponse } from "next/server";

import { authorizeHouseholdIntegrationRequest, readIntegrationHouseholdId } from "@/lib/integrations/auth";
import { createOpenClawTask, listOpenClawTasks } from "@/lib/integrations/openclaw";
import { integrationTaskDefinitionSchema } from "@/lib/integrations/validation";

export async function GET(request: Request) {
  const householdId = readIntegrationHouseholdId(request);

  if (!householdId) {
    return NextResponse.json(
      {
        error: "invalid_household",
      },
      { status: 400 },
    );
  }

  const auth = await authorizeHouseholdIntegrationRequest(request, householdId);

  if (!auth.ok) {
    return NextResponse.json(
      {
        error: auth.reason,
      },
      { status: auth.reason === "missing_key" ? 401 : 403 },
    );
  }

  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "1";
  const tasks = await listOpenClawTasks(householdId, { includeInactive });

  return NextResponse.json({
    tasks,
  });
}

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

  if (!householdId) {
    return NextResponse.json(
      {
        error: "invalid_household",
      },
      { status: 400 },
    );
  }

  const auth = await authorizeHouseholdIntegrationRequest(request, householdId);

  if (!auth.ok) {
    return NextResponse.json(
      {
        error: auth.reason,
      },
      { status: auth.reason === "missing_key" ? 401 : 403 },
    );
  }

  const parsed = integrationTaskDefinitionSchema.safeParse({
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

  const task = await createOpenClawTask(parsed.data);

  return NextResponse.json(
    {
      task,
    },
    { status: 201 },
  );
}
