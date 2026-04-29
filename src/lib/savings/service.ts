import "server-only";

import { format, startOfDay } from "date-fns";
import type { Prisma, RecurrenceType, SavingsBox, SavingsEntryType } from "@prisma/client";

import { db } from "@/lib/db";
import { sendPushToHousehold } from "@/lib/push";
import { generateRecurrenceDates } from "@/lib/scheduling/recurrence";
import { formatCurrency, toNumber } from "@/lib/savings/currency";

type Decimalish = string | number | Prisma.Decimal;

function toDecimalString(value: Decimalish): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toFixed(2);
  return value.toString();
}

function signedAmount(type: SavingsEntryType, amount: number): number {
  switch (type) {
    case "deposit":
    case "transfer_in":
    case "auto_fill":
      return amount;
    case "withdrawal":
    case "transfer_out":
      return -amount;
    case "adjustment":
      // adjustment is stored as a signed delta (can be negative when correcting balance down).
      return amount;
  }
}

export function computeBalance(
  entries: ReadonlyArray<{ type: SavingsEntryType; amount: Decimalish }>,
): number {
  let total = 0;
  for (const e of entries) {
    total += signedAmount(e.type, toNumber(e.amount as never));
  }
  return Math.round(total * 100) / 100;
}

export async function getBoxBalance(boxId: string): Promise<number> {
  const entries = await db.savingsEntry.findMany({
    where: { boxId },
    select: { type: true, amount: true },
  });
  return computeBalance(entries);
}

export async function notifySavingsGoalIfReached(params: {
  householdId: string;
  boxId: string;
  previousBalance: number;
  nextBalance: number;
}) {
  const box = await db.savingsBox.findFirst({
    where: { id: params.boxId, householdId: params.householdId },
    select: { name: true, targetAmount: true },
  });
  const target = box?.targetAmount ? toNumber(box.targetAmount) : null;
  if (!box || !target || target <= 0) return;
  if (params.previousBalance >= target || params.nextBalance < target) return;

  await sendPushToHousehold(
    params.householdId,
    {
      title: "Objectif d'épargne atteint",
      body: `${box.name} a atteint ${formatCurrency(target)}.`,
      url: "/app/epargne",
    },
    "savings.goal_reached",
  );
}

export async function getHouseholdBalances(householdId: string) {
  const entries = await db.savingsEntry.groupBy({
    by: ["boxId", "type"],
    where: { householdId },
    _sum: { amount: true },
  });

  const balances = new Map<string, number>();
  for (const row of entries) {
    const amount = toNumber(row._sum.amount ?? 0);
    const signed = signedAmount(row.type, amount);
    balances.set(row.boxId, (balances.get(row.boxId) ?? 0) + signed);
  }
  for (const [k, v] of balances) {
    balances.set(k, Math.round(v * 100) / 100);
  }
  return balances;
}

/**
 * Lazy auto-fill catch-up. Walks every active (non-paused) auto-fill rule for the household
 * and creates the SavingsEntry rows for any occurrence dates that fall between
 * `lastAppliedOn` (or `startsOn`) and today. Idempotent thanks to the
 * `(autoFillRuleId, autoFillKey)` unique index — re-running is safe.
 */
export async function runAutoFillCatchup(params: {
  householdId: string;
  asOf?: Date;
}): Promise<{ createdEntries: number; affectedBoxes: string[] }> {
  const asOf = startOfDay(params.asOf ?? new Date());

  const rules = await db.savingsAutoFillRule.findMany({
    where: {
      isPaused: false,
      box: { householdId: params.householdId, isArchived: false },
    },
    include: { box: true },
  });

  let created = 0;
  const touched = new Set<string>();
  const filledByBox = new Map<
    string,
    { householdId: string; boxName: string; amount: number; count: number; previousBalance: number }
  >();

  for (const rule of rules) {
    let previousBalance: number | null = null;
    const fromDate = rule.lastAppliedOn
      ? new Date(rule.lastAppliedOn.getTime() + 24 * 60 * 60 * 1000)
      : rule.startsOn;
    if (fromDate > asOf) continue;
    const endsOn = rule.endsOn && rule.endsOn < asOf ? rule.endsOn : asOf;

    const dates = generateRecurrenceDates(
      {
        type: rule.type as RecurrenceType,
        mode: "FIXED",
        interval: rule.interval,
        weekdays: (rule.weekdays as number[] | null) ?? undefined,
        dayOfMonth: rule.dayOfMonth ?? undefined,
        anchorDate: rule.anchorDate,
      },
      fromDate,
      endsOn,
    );

    if (dates.length === 0) continue;

    let lastApplied = rule.lastAppliedOn;

    for (const d of dates) {
      const key = format(d, "yyyy-MM-dd");
      try {
        previousBalance ??= await getBoxBalance(rule.boxId);
        await db.savingsEntry.create({
          data: {
            boxId: rule.boxId,
            householdId: rule.box.householdId,
            type: "auto_fill",
            amount: rule.amount,
            occurredOn: d,
            autoFillRuleId: rule.id,
            autoFillKey: key,
            reason: "Versement automatique",
          },
        });
        created += 1;
        touched.add(rule.boxId);
        const fill = filledByBox.get(rule.boxId) ?? {
          householdId: rule.box.householdId,
          boxName: rule.box.name,
          amount: toNumber(rule.amount),
          count: 0,
          previousBalance,
        };
        fill.count++;
        filledByBox.set(rule.boxId, fill);
        if (!lastApplied || d > lastApplied) lastApplied = d;
      } catch (err) {
        // P2002 unique violation = already applied for that date, skip silently.
        const code = (err as { code?: string }).code;
        if (code !== "P2002") throw err;
      }
    }

    if (lastApplied !== rule.lastAppliedOn) {
      await db.savingsAutoFillRule.update({
        where: { id: rule.id },
        data: { lastAppliedOn: lastApplied },
      });
    }
  }

  for (const [boxId, fill] of filledByBox) {
    const total = Math.round(fill.amount * fill.count * 100) / 100;
    const nextBalance = fill.previousBalance + total;
    await sendPushToHousehold(
      fill.householdId,
      {
        title: "Versement automatique appliqué",
        body: `${formatCurrency(total)} ajouté${fill.count > 1 ? "s" : ""} à ${fill.boxName}.`,
        url: "/app/epargne",
      },
      "savings.auto_fill_applied",
    );
    await notifySavingsGoalIfReached({
      householdId: fill.householdId,
      boxId,
      previousBalance: fill.previousBalance,
      nextBalance,
    });
  }

  return { createdEntries: created, affectedBoxes: Array.from(touched) };
}

export async function listBoxesWithBalances(householdId: string, options?: { includeArchived?: boolean }) {
  const boxes = await db.savingsBox.findMany({
    where: {
      householdId,
      ...(options?.includeArchived ? {} : { isArchived: false }),
    },
    include: { autoFillRule: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const balances = await getHouseholdBalances(householdId);

  return boxes.map((box) => ({
    ...box,
    balance: balances.get(box.id) ?? 0,
  }));
}

export type BoxWithBalance = SavingsBox & { balance: number };

export async function createTransfer(params: {
  householdId: string;
  fromBoxId: string;
  toBoxId: string;
  amount: number;
  occurredOn: Date;
  reason?: string | null;
  authorMemberId?: string | null;
}) {
  if (params.fromBoxId === params.toBoxId) {
    throw new Error("Source and destination boxes must differ");
  }
  const amountStr = toDecimalString(params.amount);
  const toPreviousBalance = await getBoxBalance(params.toBoxId);

  const transfer = await db.$transaction(async (tx) => {
    const [from, to] = await Promise.all([
      tx.savingsBox.findFirst({ where: { id: params.fromBoxId, householdId: params.householdId } }),
      tx.savingsBox.findFirst({ where: { id: params.toBoxId, householdId: params.householdId } }),
    ]);
    if (!from || !to) throw new Error("Box not found in household");

    const transfer = await tx.savingsTransfer.create({
      data: {
        householdId: params.householdId,
        fromBoxId: params.fromBoxId,
        toBoxId: params.toBoxId,
        amount: amountStr,
        occurredOn: params.occurredOn,
        reason: params.reason ?? null,
        authorMemberId: params.authorMemberId ?? null,
      },
    });

    await tx.savingsEntry.createMany({
      data: [
        {
          boxId: params.fromBoxId,
          householdId: params.householdId,
          type: "transfer_out",
          amount: amountStr,
          occurredOn: params.occurredOn,
          reason: params.reason ?? null,
          authorMemberId: params.authorMemberId ?? null,
          transferId: transfer.id,
        },
        {
          boxId: params.toBoxId,
          householdId: params.householdId,
          type: "transfer_in",
          amount: amountStr,
          occurredOn: params.occurredOn,
          reason: params.reason ?? null,
          authorMemberId: params.authorMemberId ?? null,
          transferId: transfer.id,
        },
      ],
    });

    return transfer;
  });

  await notifySavingsGoalIfReached({
    householdId: params.householdId,
    boxId: params.toBoxId,
    previousBalance: toPreviousBalance,
    nextBalance: toPreviousBalance + params.amount,
  });

  return transfer;
}

export async function adjustBoxBalance(params: {
  householdId: string;
  boxId: string;
  targetAmount: number;
  occurredOn: Date;
  reason?: string | null;
  authorMemberId?: string | null;
}) {
  const box = await db.savingsBox.findFirst({
    where: { id: params.boxId, householdId: params.householdId },
  });
  if (!box) throw new Error("Box not found");

  const currentBalance = await getBoxBalance(params.boxId);
  const delta = Math.round((params.targetAmount - currentBalance) * 100) / 100;

  if (delta === 0) {
    return null;
  }

  const entry = await db.savingsEntry.create({
    data: {
      boxId: params.boxId,
      householdId: params.householdId,
      type: "adjustment",
      amount: delta.toFixed(2),
      occurredOn: params.occurredOn,
      reason: params.reason ?? `Ajustement du solde à ${params.targetAmount.toFixed(2)} €`,
      authorMemberId: params.authorMemberId ?? null,
    },
  });

  await notifySavingsGoalIfReached({
    householdId: params.householdId,
    boxId: params.boxId,
    previousBalance: currentBalance,
    nextBalance: params.targetAmount,
  });

  return entry;
}

export async function deleteTransfer(params: { transferId: string; householdId: string }) {
  return db.$transaction(async (tx) => {
    const transfer = await tx.savingsTransfer.findFirst({
      where: { id: params.transferId, householdId: params.householdId },
    });
    if (!transfer) return null;
    await tx.savingsEntry.deleteMany({ where: { transferId: params.transferId } });
    await tx.savingsTransfer.delete({ where: { id: params.transferId } });
    return transfer;
  });
}
