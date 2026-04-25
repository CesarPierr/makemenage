import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

const ALLOWED_EVENTS = new Set([
  "home.rendered",
  "quick_add.submitted",
  "session.started",
  "session.completed",
  "task_detail.opened",
  "filter.toggled",
]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 204 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = typeof body === "object" && body && "event" in body ? String((body as { event: unknown }).event) : "";
  if (!ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  const props =
    typeof body === "object" && body && "props" in body
      ? ((body as { props: unknown }).props as Record<string, unknown> | undefined)
      : undefined;

  logInfo("ux.event", {
    event,
    userId: user.id,
    ...(props && typeof props === "object" ? { props } : {}),
  });

  return new NextResponse(null, { status: 204 });
}
