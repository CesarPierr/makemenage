import { NextResponse } from "next/server";

import { authorizeHouseholdIntegrationRequest, readIntegrationHouseholdId } from "@/lib/integrations/auth";
import { deleteOpenClawTask, updateOpenClawTask } from "@/lib/integrations/openclaw";
import { integrationTaskDeleteSchema, integrationTaskPatchSchema } from "@/lib/integrations/validation";

type RouteParams = {
  params: Promise<{ taskId: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const { taskId } = await params;
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

  const parsed = integrationTaskPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const task = await updateOpenClawTask(taskId, householdId, parsed.data);

  if (!task) {
    return NextResponse.json(
      {
        error: "task_not_found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    task,
  });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { taskId } = await params;
  const body = request.headers.get("content-length") === "0" ? null : await request.json().catch(() => null);
  const householdId = readIntegrationHouseholdId(
    request,
    body && typeof body === "object" && "householdId" in body ? String(body.householdId) : null,
  );

  const parsed = integrationTaskDeleteSchema.safeParse({
    householdId,
    deleteManual:
      body && typeof body === "object" && "deleteManual" in body ? Boolean(body.deleteManual) : false,
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

  const result = await deleteOpenClawTask({
    taskId,
    householdId: parsed.data.householdId,
    deleteManual: parsed.data.deleteManual,
  });

  if (!result) {
    return NextResponse.json(
      {
        error: "task_not_found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    deleted: result,
  });
}
