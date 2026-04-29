import { NextRequest, NextResponse } from "next/server";

import { dataErrorOrRedirect, dataOrRedirect, withHousehold } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTransfer } from "@/lib/savings/service";
import { savingsTransferSchema } from "@/lib/validation";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: householdId } = await ctx.params;

  const membership = await db.householdMember.findFirst({
    where: { householdId, userId: user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const transfers = await db.savingsTransfer.findMany({
    where: { householdId },
    include: {
      fromBox: { select: { name: true, color: true, icon: true } },
      toBox: { select: { name: true, color: true, icon: true } },
    },
    orderBy: { occurredOn: "desc" },
    take: 50,
  });

  return NextResponse.json({
    transfers: transfers.map((t) => ({
      ...t,
      amount: t.amount.toString(),
    })),
  });
}

export const POST = withHousehold<{ id: string }>(
  async ({ request, params, membership, formData }) => {
    const householdId = params.id;
    const fallback = `/app/epargne?household=${householdId}&error=invalid`;

    const parsed = savingsTransferSchema.safeParse({
      fromBoxId: formData.get("fromBoxId"),
      toBoxId: formData.get("toBoxId"),
      amount: formData.get("amount"),
      occurredOn: formData.get("occurredOn"),
      reason: formData.get("reason") || undefined,
    });

    if (!parsed.success) {
      return dataErrorOrRedirect(request, 400, "Données invalides.", fallback);
    }

    try {
      const transfer = await createTransfer({
        householdId,
        fromBoxId: parsed.data.fromBoxId,
        toBoxId: parsed.data.toBoxId,
        amount: parsed.data.amount,
        occurredOn: parsed.data.occurredOn,
        reason: parsed.data.reason ?? null,
        authorMemberId: membership.id,
      });

      return dataOrRedirect(request, `/app/epargne?household=${householdId}&transfer=${transfer.id}`, {
        transfer: { ...transfer, amount: transfer.amount.toString() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transfert impossible.";
      return dataErrorOrRedirect(request, 400, message, fallback);
    }
  },
);
