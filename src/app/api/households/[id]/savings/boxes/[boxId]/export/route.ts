import { format } from "date-fns";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const ENTRY_LABEL: Record<string, string> = {
  deposit: "Versement",
  withdrawal: "Retrait",
  transfer_in: "Transfert reçu",
  transfer_out: "Transfert envoyé",
  auto_fill: "Auto-versement",
  adjustment: "Ajustement",
};

function csvCell(value: string | null | undefined) {
  const v = value ?? "";
  if (/[",\n;]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

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
    return new Response("Forbidden", { status: 403 });
  }

  const box = await db.savingsBox.findFirst({ where: { id: boxId, householdId } });
  if (!box) {
    return new Response("Not found", { status: 404 });
  }

  const entries = await db.savingsEntry.findMany({
    where: { boxId, householdId },
    orderBy: [{ occurredOn: "asc" }, { createdAt: "asc" }],
  });

  const lines: string[] = [];
  lines.push("Date;Type;Montant;Raison");
  for (const e of entries) {
    const amount = e.amount.toString();
    const signedAmount = ["deposit", "transfer_in", "auto_fill"].includes(e.type)
      ? amount
      : e.type === "adjustment"
        ? amount
        : `-${amount}`;
    lines.push([
      format(e.occurredOn, "yyyy-MM-dd"),
      ENTRY_LABEL[e.type] ?? e.type,
      signedAmount,
      csvCell(e.reason),
    ].join(";"));
  }

  const filename = `epargne-${box.name.replace(/[^a-zA-Z0-9-_]/g, "_")}-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
