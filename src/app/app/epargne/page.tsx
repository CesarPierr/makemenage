import { redirect } from "next/navigation";

import { EpargneClient } from "@/components/savings/epargne-client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listBoxesWithBalances, runAutoFillCatchup } from "@/lib/savings/service";
import type { SavingsBoxView } from "@/components/savings/types";

type PageProps = {
  searchParams: Promise<{ household?: string }>;
};

export default async function EpargnePage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = await searchParams;

  const membership = await db.householdMember.findFirst({
    where: { userId: user.id, ...(params.household ? { householdId: params.household } : {}) },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) {
    redirect("/app");
  }

  await runAutoFillCatchup({ householdId: membership.householdId });

  const boxes = await listBoxesWithBalances(membership.householdId, { includeArchived: true });
  const totalBalance = boxes
    .filter((b) => !b.isArchived)
    .reduce((sum, b) => sum + b.balance, 0);

  const initialBoxes: SavingsBoxView[] = boxes.map((b) => ({
    id: b.id,
    householdId: b.householdId,
    name: b.name,
    kind: b.kind,
    icon: b.icon,
    color: b.color,
    targetAmount: b.targetAmount?.toString() ?? null,
    targetDate: b.targetDate ? b.targetDate.toISOString() : null,
    allowNegative: b.allowNegative,
    isArchived: b.isArchived,
    sortOrder: b.sortOrder,
    notes: b.notes,
    balance: Math.round(b.balance * 100) / 100,
    autoFillRule: b.autoFillRule
      ? {
          id: b.autoFillRule.id,
          amount: b.autoFillRule.amount.toString(),
          type: b.autoFillRule.type as SavingsBoxView["autoFillRule"] extends infer T
            ? T extends { type: infer U }
              ? U
              : never
            : never,
          interval: b.autoFillRule.interval,
          weekdays: (b.autoFillRule.weekdays as number[] | null) ?? null,
          dayOfMonth: b.autoFillRule.dayOfMonth,
          anchorDate: b.autoFillRule.anchorDate.toISOString(),
          startsOn: b.autoFillRule.startsOn.toISOString(),
          endsOn: b.autoFillRule.endsOn ? b.autoFillRule.endsOn.toISOString() : null,
          isPaused: b.autoFillRule.isPaused,
          lastAppliedOn: b.autoFillRule.lastAppliedOn ? b.autoFillRule.lastAppliedOn.toISOString() : null,
        }
      : null,
  }));

  return (
    <EpargneClient
      householdId={membership.householdId}
      initialBoxes={initialBoxes}
      initialTotalBalance={Math.round(totalBalance * 100) / 100}
    />
  );
}
