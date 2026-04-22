import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  disableOpenClawIntegration,
  getOpenClawIntegrationSettings,
  upsertOpenClawIntegrationSettings,
} from "@/lib/integrations/openclaw";
import { integrationSettingsSchema } from "@/lib/integrations/validation";
import { canManageHousehold } from "@/lib/households";

async function requireManageableHousehold(userId: string, householdId: string) {
  const membership = await db.householdMember.findFirst({
    where: {
      householdId,
      userId,
    },
  });

  if (!membership || !canManageHousehold(membership.role)) {
    return null;
  }

  return membership;
}

export async function GET(request: Request) {
  const user = await requireUser();
  const householdId = new URL(request.url).searchParams.get("householdId");

  if (!householdId) {
    return NextResponse.json(
      {
        error: "invalid_household",
      },
      { status: 400 },
    );
  }

  const membership = await requireManageableHousehold(user.id, householdId);

  if (!membership) {
    return NextResponse.json(
      {
        error: "forbidden",
      },
      { status: 403 },
    );
  }

  const integration = await getOpenClawIntegrationSettings(householdId);

  return NextResponse.json({
    integration,
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        error: "invalid_json",
      },
      { status: 400 },
    );
  }

  const parsed = integrationSettingsSchema.safeParse({
    ...body,
    regenerateKey: Boolean(body.regenerateKey),
    isEnabled: Boolean(body.isEnabled),
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

  const membership = await requireManageableHousehold(user.id, parsed.data.householdId);

  if (!membership) {
    return NextResponse.json(
      {
        error: "forbidden",
      },
      { status: 403 },
    );
  }

  const result = await upsertOpenClawIntegrationSettings(parsed.data);

  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => null);
  const householdId =
    body && typeof body === "object" && "householdId" in body ? String(body.householdId) : null;

  if (!householdId) {
    return NextResponse.json(
      {
        error: "invalid_household",
      },
      { status: 400 },
    );
  }

  const membership = await requireManageableHousehold(user.id, householdId);

  if (!membership) {
    return NextResponse.json(
      {
        error: "forbidden",
      },
      { status: 403 },
    );
  }

  const integration = await disableOpenClawIntegration(householdId);

  return NextResponse.json({
    integration,
  });
}
