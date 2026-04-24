import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ error: "Push non configuré" }, { status: 503 });
  return NextResponse.json({ key });
}
