import { NextResponse } from "next/server";

import { dataErrorOrRedirect, dataOrRedirect, withHousehold } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeCalculator } from "@/lib/savings/calculators";
import { evaluateFormula } from "@/lib/savings/formula";
import { savingsCalculatorSchema } from "@/lib/validation";

function parseFields(formData: FormData) {
  const raw = formData.get("fields");
  if (!raw) return null;
  try {
    return JSON.parse(raw.toString()) as unknown;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string; calculatorId: string }> },
) {
  const user = await requireUser();
  const { id: householdId, calculatorId } = await ctx.params;

  const membership = await db.householdMember.findFirst({
    where: { householdId, userId: user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const calculator = await db.savingsCalculator.findFirst({
    where: { id: calculatorId, householdId },
    include: { fields: true },
  });
  if (!calculator) {
    return NextResponse.json({ error: "Calculator not found" }, { status: 404 });
  }

  return NextResponse.json({ calculator: serializeCalculator(calculator) });
}

export const POST = withHousehold<{ id: string; calculatorId: string }>(
  async ({ request, params, formData }) => {
    const householdId = params.id;
    const calculatorId = params.calculatorId;
    const fallback = `/app/epargne?household=${householdId}&error=calculator`;

    const existing = await db.savingsCalculator.findFirst({
      where: { id: calculatorId, householdId },
    });
    if (!existing) {
      return dataErrorOrRedirect(request, 404, "Calculateur introuvable.", fallback);
    }

    const action = formData.get("_action")?.toString() ?? "update";

    if (action === "archive" || action === "unarchive") {
      const updated = await db.savingsCalculator.update({
        where: { id: calculatorId },
        data: { isArchived: action === "archive" },
        include: { fields: true },
      });
      return dataOrRedirect(request, `/app/epargne?household=${householdId}&tab=calculators`, {
        calculator: serializeCalculator(updated),
      });
    }

    if (action === "delete") {
      await db.savingsCalculator.delete({ where: { id: calculatorId } });
      return dataOrRedirect(request, `/app/epargne?household=${householdId}&tab=calculators`, {
        deleted: calculatorId,
      });
    }

    const fields = parseFields(formData);
    const parsed = savingsCalculatorSchema.safeParse({
      boxId: formData.get("boxId"),
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      formula: formData.get("formula"),
      reasonTemplate: formData.get("reasonTemplate") || undefined,
      resultMode: formData.get("resultMode") || undefined,
      negativeMode: formData.get("negativeMode") || undefined,
      roundingMode: formData.get("roundingMode") || undefined,
      fields,
    });

    if (!parsed.success) {
      return dataErrorOrRedirect(request, 400, "Données invalides.", fallback);
    }

    if (parsed.data.boxId) {
      const box = await db.savingsBox.findFirst({
        where: { id: parsed.data.boxId, householdId },
      });
      if (!box) {
        return dataErrorOrRedirect(request, 404, "Enveloppe introuvable.", fallback);
      }
    }

    try {
      const sampleValues = Object.fromEntries(parsed.data.fields.map((field) => [field.key, field.defaultValue ?? 1]));
      evaluateFormula(parsed.data.formula, sampleValues);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Formule invalide.";
      return dataErrorOrRedirect(request, 400, message, fallback);
    }

    const updated = await db.$transaction(async (tx) => {
      await tx.savingsCalculatorField.deleteMany({ where: { calculatorId } });
      return tx.savingsCalculator.update({
        where: { id: calculatorId },
        data: {
          boxId: parsed.data.boxId ?? null,
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          formula: parsed.data.formula,
          reasonTemplate: parsed.data.reasonTemplate ?? null,
          resultMode: parsed.data.resultMode,
          negativeMode: parsed.data.negativeMode,
          roundingMode: parsed.data.roundingMode,
          fields: {
            create: parsed.data.fields.map((field, index) => ({
              key: field.key,
              label: field.label,
              type: field.type,
              defaultValue: field.defaultValue == null ? null : field.defaultValue.toFixed(4),
              helperText: field.helperText ?? null,
              isRequired: field.isRequired,
              sortOrder: field.sortOrder ?? index,
            })),
          },
        },
        include: { fields: true },
      });
    });

    return dataOrRedirect(request, `/app/epargne?household=${householdId}&tab=calculators`, {
      calculator: serializeCalculator(updated),
    });
  },
);
