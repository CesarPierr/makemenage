import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const params = await context.params;

    const membership = await db.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: params.id,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    await db.householdMember.update({
      where: { id: membership.id },
      data: { onboardingCompletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
