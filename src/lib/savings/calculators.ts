import "server-only";

import type {
  SavingsCalculator,
  SavingsCalculatorField,
  SavingsCalculatorNegativeMode,
  SavingsCalculatorResultMode,
  SavingsCalculatorRoundingMode,
} from "@prisma/client";

import { db } from "@/lib/db";
import { evaluateFormula, interpolateReasonTemplate } from "@/lib/savings/formula";
import { getBoxBalance, notifySavingsGoalIfReached } from "@/lib/savings/service";
import { toNumber } from "@/lib/savings/currency";

type CalculatorWithFields = SavingsCalculator & {
  fields: SavingsCalculatorField[];
};

export function applyCalculatorRounding(value: number, mode: SavingsCalculatorRoundingMode) {
  switch (mode) {
    case "euro_floor":
      return Math.floor(value);
    case "euro_ceil":
      return Math.ceil(value);
    case "euro_nearest":
      return Math.round(value);
    case "cents":
      return Math.round(value * 100) / 100;
  }
}

export function resolveCalculatorEntry(params: {
  rawResult: number;
  resultMode: SavingsCalculatorResultMode;
  negativeMode: SavingsCalculatorNegativeMode;
  roundingMode: SavingsCalculatorRoundingMode;
}) {
  let value = params.rawResult;
  let entryType: "deposit" | "withdrawal" = params.resultMode;

  if (value < 0) {
    if (params.negativeMode === "clamp_to_zero") {
      value = 0;
    } else {
      value = Math.abs(value);
      entryType = params.resultMode === "deposit" ? "withdrawal" : "deposit";
    }
  }

  return {
    entryType,
    amount: applyCalculatorRounding(value, params.roundingMode),
  };
}

export function serializeCalculator(calculator: CalculatorWithFields) {
  return {
    ...calculator,
    fields: calculator.fields
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((field) => ({
        ...field,
        defaultValue: field.defaultValue?.toString() ?? null,
      })),
  };
}

export function buildCalculatorValues(
  calculator: CalculatorWithFields,
  rawInputs: Record<string, string | number | undefined>,
) {
  const values: Record<string, number> = {};

  for (const field of calculator.fields) {
    const raw = rawInputs[field.key];
    const value =
      raw == null || String(raw).trim() === ""
        ? field.defaultValue == null
          ? null
          : toNumber(field.defaultValue)
        : Number.parseFloat(String(raw).trim().replace(/\s/g, "").replace(",", "."));

    if (value == null || !Number.isFinite(value)) {
      if (field.isRequired) {
        throw new Error(`Valeur invalide pour ${field.label}.`);
      }
      values[field.key] = 0;
      continue;
    }
    values[field.key] = Math.round(value * 10000) / 10000;
  }

  return values;
}

export function previewCalculator(calculator: CalculatorWithFields, values: Record<string, number>) {
  const rawResult = evaluateFormula(calculator.formula, values);
  const resolved = resolveCalculatorEntry({
    rawResult,
    resultMode: calculator.resultMode,
    negativeMode: calculator.negativeMode,
    roundingMode: calculator.roundingMode,
  });
  return {
    rawResult: Math.round(rawResult * 10000) / 10000,
    ...resolved,
    reason: interpolateReasonTemplate(calculator.reasonTemplate, {
      ...values,
      result: resolved.amount,
    }),
  };
}

export async function runSavingsCalculator(params: {
  householdId: string;
  calculatorId: string;
  inputs: Record<string, string | number | undefined>;
  authorMemberId?: string | null;
}) {
  const calculator = await db.savingsCalculator.findFirst({
    where: {
      id: params.calculatorId,
      householdId: params.householdId,
      isArchived: false,
    },
    include: { fields: true, box: true },
  });
  if (!calculator) throw new Error("Calculateur introuvable.");
  if (calculator.box.isArchived) throw new Error("L'enveloppe liée est archivée.");

  const values = buildCalculatorValues(calculator, params.inputs);
  const preview = previewCalculator(calculator, values);
  if (preview.amount <= 0) {
    throw new Error("Le résultat est nul : aucun mouvement à créer.");
  }

  const previousBalance = await getBoxBalance(calculator.boxId);

  const { entry, run } = await db.$transaction(async (tx) => {
    const entry = await tx.savingsEntry.create({
      data: {
        boxId: calculator.boxId,
        householdId: params.householdId,
        type: preview.entryType,
        amount: preview.amount.toFixed(2),
        occurredOn: new Date(),
        reason: preview.reason ?? calculator.name,
        authorMemberId: params.authorMemberId ?? null,
      },
    });

    const run = await tx.savingsCalculatorRun.create({
      data: {
        calculatorId: calculator.id,
        householdId: params.householdId,
        boxId: calculator.boxId,
        inputValues: values,
        rawResult: preview.rawResult.toFixed(4),
        resultAmount: preview.amount.toFixed(2),
        entryType: preview.entryType,
        entryId: entry.id,
        authorMemberId: params.authorMemberId ?? null,
      },
    });

    return { entry, run };
  });

  const delta = preview.entryType === "deposit" ? preview.amount : -preview.amount;
  await notifySavingsGoalIfReached({
    householdId: params.householdId,
    boxId: calculator.boxId,
    previousBalance,
    nextBalance: previousBalance + delta,
  });

  return { entry, run, preview };
}
