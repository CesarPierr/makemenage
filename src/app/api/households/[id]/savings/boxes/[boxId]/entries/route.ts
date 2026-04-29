import { NextResponse } from "next/server";

import { dataErrorOrRedirect, dataOrRedirect, withHousehold } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBoxBalance, notifySavingsGoalIfReached } from "@/lib/savings/service";
import { savingsEntrySchema } from "@/lib/validation";

const PAGE_SIZE = 30;

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string; boxId: string }> },
) {
  const user = await requireUser();
  const { id: householdId, boxId } = await ctx.params;

  const membership = await db.householdMember.findFirst({
    where: { householdId, userId: user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");

  const entries = await db.savingsEntry.findMany({
    where: { boxId, householdId },
    orderBy: [{ occurredOn: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = entries.length > PAGE_SIZE;
  const page = hasMore ? entries.slice(0, PAGE_SIZE) : entries;

  return NextResponse.json({
    entries: page.map((e) => ({ ...e, amount: e.amount.toString() })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}

export const POST = withHousehold<{ id: string; boxId: string }>(
  async ({ request, params, membership, formData }) => {
    const householdId = params.id;
    const boxId = params.boxId;
    const fallback = `/app/epargne?household=${householdId}&box=${boxId}&error=invalid`;

    const box = await db.savingsBox.findFirst({ where: { id: boxId, householdId } });
    if (!box) {
      return dataErrorOrRedirect(request, 404, "Enveloppe introuvable.", fallback);
    }

    const parsed = savingsEntrySchema.safeParse({
      type: formData.get("type"),
      amount: formData.get("amount"),
      occurredOn: formData.get("occurredOn"),
      reason: formData.get("reason") || undefined,
    });

    if (!parsed.success) {
      return dataErrorOrRedirect(request, 400, "Données invalides.", fallback);
    }

    const previousBalance = await getBoxBalance(boxId);
    const entry = await db.savingsEntry.create({
      data: {
        boxId,
        householdId,
        type: parsed.data.type,
        amount: parsed.data.amount.toFixed(2),
        occurredOn: parsed.data.occurredOn,
        reason: parsed.data.reason ?? null,
        authorMemberId: membership.id,
      },
    });
    const delta = parsed.data.type === "deposit" ? parsed.data.amount : -parsed.data.amount;
    await notifySavingsGoalIfReached({
      householdId,
      boxId,
      previousBalance,
      nextBalance: previousBalance + delta,
    });

    return dataOrRedirect(request, `/app/epargne?household=${householdId}&box=${boxId}&entry=${entry.id}`, {
      entry: { ...entry, amount: entry.amount.toString() },
    });
  },
);
