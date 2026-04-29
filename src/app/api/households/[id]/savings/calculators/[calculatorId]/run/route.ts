import { dataErrorOrRedirect, dataOrRedirect, withHousehold } from "@/lib/api";
import { runSavingsCalculator } from "@/lib/savings/calculators";
import { savingsCalculatorRunSchema } from "@/lib/validation";

export const POST = withHousehold<{ id: string; calculatorId: string }>(
  async ({ request, params, membership, formData }) => {
    const householdId = params.id;
    const calculatorId = params.calculatorId;
    const fallback = `/app/epargne?household=${householdId}&error=calculator-run`;

    const inputs: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("input:")) {
        inputs[key.slice("input:".length)] = value.toString();
      }
    }

    const parsed = savingsCalculatorRunSchema.safeParse({
      targetBoxId: formData.get("targetBoxId") || undefined,
      inputs,
    });
    if (!parsed.success) {
      return dataErrorOrRedirect(request, 400, "Données invalides.", fallback);
    }

    try {
      const result = await runSavingsCalculator({
        householdId,
        calculatorId,
        targetBoxId: parsed.data.targetBoxId,
        inputs: parsed.data.inputs,
        authorMemberId: membership.id,
      });

      return dataOrRedirect(request, `/app/epargne?household=${householdId}&box=${result.run.boxId}&calculatorRun=${result.run.id}`, {
        entry: { ...result.entry, amount: result.entry.amount.toString() },
        run: {
          ...result.run,
          rawResult: result.run.rawResult.toString(),
          resultAmount: result.run.resultAmount.toString(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Calcul impossible.";
      return dataErrorOrRedirect(request, 400, message, fallback);
    }
  },
);
