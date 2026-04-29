import { NextResponse } from "next/server";
import { withHousehold } from "@/lib/api";
import { db } from "@/lib/db";

export const GET = withHousehold<{ id: string }>(
  async ({ params }) => {
    const householdId = params.id;

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
  },
);
