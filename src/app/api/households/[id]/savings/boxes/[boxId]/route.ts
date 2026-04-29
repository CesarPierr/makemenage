import { NextResponse } from "next/server";

import { dataErrorOrRedirect, dataOrRedirect, withHousehold } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeBalance } from "@/lib/savings/service";
import { savingsBoxUpdateSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
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

  const box = await db.savingsBox.findFirst({
    where: { id: boxId, householdId },
    include: { autoFillRule: true },
  });
  if (!box) {
    return NextResponse.json({ error: "Box not found" }, { status: 404 });
  }

  const entries = await db.savingsEntry.findMany({
    where: { boxId },
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  const balance = computeBalance(
    await db.savingsEntry.findMany({ where: { boxId }, select: { type: true, amount: true } }),
  );

  return NextResponse.json({
    box: {
      ...box,
      targetAmount: box.targetAmount?.toString() ?? null,
      autoFillRule: box.autoFillRule
        ? { ...box.autoFillRule, amount: box.autoFillRule.amount.toString() }
        : null,
    },
    entries: entries.map((e) => ({ ...e, amount: e.amount.toString() })),
    balance,
  });
}

export const POST = withHousehold<{ id: string; boxId: string }>(
  async ({ request, params, formData }) => {
    const householdId = params.id;
    const boxId = params.boxId;
    const fallback = `/app/epargne?household=${householdId}&box=${boxId}&error=invalid`;

    const action = formData.get("_action")?.toString() ?? "update";

    const box = await db.savingsBox.findFirst({ where: { id: boxId, householdId } });
    if (!box) {
      return dataErrorOrRedirect(request, 404, "Enveloppe introuvable.", fallback);
    }

    if (action === "delete") {
      await db.savingsBox.delete({ where: { id: boxId } });
      return dataOrRedirect(request, `/app/epargne?household=${householdId}&deleted=1`);
    }

    if (action === "archive" || action === "unarchive") {
      await db.savingsBox.update({
        where: { id: boxId },
        data: { isArchived: action === "archive" },
      });
      return dataOrRedirect(request, `/app/epargne?household=${householdId}&archived=${action === "archive" ? 1 : 0}`);
    }

    // update
    const parsed = savingsBoxUpdateSchema.safeParse({
      name: formData.get("name") || undefined,
      kind: formData.get("kind") || undefined,
      icon: formData.get("icon") || undefined,
      color: formData.get("color") || undefined,
      targetAmount: formData.get("targetAmount") || undefined,
      targetDate: formData.get("targetDate") || undefined,
      allowNegative: formData.has("allowNegative")
        ? formData.get("allowNegative") === "on" || formData.get("allowNegative") === "true"
        : undefined,
      notes: formData.get("notes") || undefined,
      sortOrder: formData.get("sortOrder") || undefined,
    });

    if (!parsed.success) {
      return dataErrorOrRedirect(request, 400, "Données invalides.", fallback);
    }

    const updated = await db.savingsBox.update({
      where: { id: boxId },
      data: {
        name: parsed.data.name ?? undefined,
        kind: parsed.data.kind ?? undefined,
        icon: parsed.data.icon ?? undefined,
        color: parsed.data.color ?? undefined,
        targetAmount: parsed.data.targetAmount !== undefined ? parsed.data.targetAmount.toFixed(2) : undefined,
        targetDate: parsed.data.targetDate ?? undefined,
        allowNegative: parsed.data.allowNegative ?? undefined,
        notes: parsed.data.notes ?? undefined,
        sortOrder: parsed.data.sortOrder ?? undefined,
      },
    });

    return dataOrRedirect(request, `/app/epargne?household=${householdId}&box=${boxId}&updated=1`, {
      box: { ...updated, targetAmount: updated.targetAmount?.toString() ?? null },
    });
  },
);
