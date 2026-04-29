import { NextResponse } from "next/server";

import { dataErrorOrRedirect, dataOrRedirect, withHousehold } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listBoxesWithBalances, runAutoFillCatchup } from "@/lib/savings/service";
import { savingsAutoFillSchema, savingsBoxCreateSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: householdId } = await ctx.params;

  const membership = await db.householdMember.findFirst({
    where: { householdId, userId: user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await runAutoFillCatchup({ householdId });

  const url = new URL(request.url);
  const includeArchived = url.searchParams.get("archived") === "1";
  const boxes = await listBoxesWithBalances(householdId, { includeArchived });

  const totalBalance = boxes.reduce((sum, b) => sum + b.balance, 0);

  return NextResponse.json({
    boxes: boxes.map((b) => ({
      ...b,
      targetAmount: b.targetAmount?.toString() ?? null,
      balance: Math.round(b.balance * 100) / 100,
    })),
    totalBalance: Math.round(totalBalance * 100) / 100,
  });
}

export const POST = withHousehold<{ id: string }>(
  async ({ request, params, membership, formData }) => {
    const householdId = params.id;
    const fallback = `/app/epargne?household=${householdId}&error=invalid`;

    const parsed = savingsBoxCreateSchema.safeParse({
      name: formData.get("name"),
      kind: formData.get("kind") || undefined,
      icon: formData.get("icon") || undefined,
      color: formData.get("color") || undefined,
      initialBalance: formData.get("initialBalance") || undefined,
      targetAmount: formData.get("targetAmount") || undefined,
      targetDate: formData.get("targetDate") || undefined,
      allowNegative: formData.get("allowNegative") === "on" || formData.get("allowNegative") === "true",
      notes: formData.get("notes") || undefined,
    });

    if (!parsed.success) {
      return dataErrorOrRedirect(request, 400, "Données invalides.", fallback);
    }

    const autoFillEnabled = formData.get("autoFillEnabled") === "on" || formData.get("autoFillEnabled") === "true";
    const autoFill = autoFillEnabled
      ? savingsAutoFillSchema.safeParse({
          amount: formData.get("autoFillAmount"),
          type: formData.get("autoFillType"),
          interval: formData.get("autoFillInterval") || 1,
          weekdays: formData.getAll("autoFillWeekdays").map((v) => Number.parseInt(v.toString(), 10)).filter(Number.isFinite),
          dayOfMonth: formData.get("autoFillDayOfMonth") || undefined,
          anchorDate: formData.get("autoFillStartsOn"),
          startsOn: formData.get("autoFillStartsOn"),
          endsOn: formData.get("autoFillEndsOn") || undefined,
        })
      : null;

    if (autoFill && !autoFill.success) {
      return dataErrorOrRedirect(request, 400, "Auto-versement invalide.", fallback);
    }

    const lastBox = await db.savingsBox.findFirst({
      where: { householdId },
      orderBy: { sortOrder: "desc" },
    });
    const nextOrder = (lastBox?.sortOrder ?? -1) + 1;
    const initialBalance = parsed.data.initialBalance ?? 0;

    const box = await db.$transaction(async (tx) => {
      const created = await tx.savingsBox.create({
        data: {
          householdId,
          name: parsed.data.name,
          kind: parsed.data.kind,
          icon: parsed.data.icon ?? null,
          color: parsed.data.color,
          targetAmount: parsed.data.targetAmount?.toFixed(2),
          targetDate: parsed.data.targetDate ?? null,
          allowNegative: parsed.data.allowNegative || parsed.data.kind === "debt" || initialBalance < 0,
          notes: parsed.data.notes ?? null,
          sortOrder: nextOrder,
          createdByMemberId: membership.id,
        },
      });

      if (initialBalance !== 0) {
        await tx.savingsEntry.create({
          data: {
            boxId: created.id,
            householdId,
            type: "adjustment",
            amount: initialBalance.toFixed(2),
            occurredOn: new Date(),
            reason: "Solde initial",
            authorMemberId: membership.id,
          },
        });
      }

      if (autoFill?.success) {
        await tx.savingsAutoFillRule.create({
          data: {
            boxId: created.id,
            amount: autoFill.data.amount.toFixed(2),
            type: autoFill.data.type,
            interval: autoFill.data.interval,
            weekdays: autoFill.data.weekdays ?? undefined,
            dayOfMonth: autoFill.data.dayOfMonth ?? null,
            anchorDate: autoFill.data.anchorDate,
            startsOn: autoFill.data.startsOn,
            endsOn: autoFill.data.endsOn ?? null,
            isPaused: autoFill.data.isPaused,
          },
        });
      }

      return created;
    });

    return dataOrRedirect(request, `/app/epargne?household=${householdId}&created=${box.id}`, {
      box: { ...box, targetAmount: box.targetAmount?.toString() ?? null },
    });
  },
);
