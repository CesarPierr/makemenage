import { dataErrorOrRedirect, dataOrRedirect, withHousehold } from "@/lib/api";
import { adjustBoxBalance } from "@/lib/savings/service";
import { savingsAdjustSchema } from "@/lib/validation";

export const POST = withHousehold<{ id: string; boxId: string }>(
  async ({ request, params, membership, formData }) => {
    const householdId = params.id;
    const boxId = params.boxId;
    const fallback = `/app/epargne?household=${householdId}&box=${boxId}&error=invalid`;

    const parsed = savingsAdjustSchema.safeParse({
      targetAmount: formData.get("targetAmount"),
      occurredOn: formData.get("occurredOn"),
      reason: formData.get("reason") || undefined,
    });

    if (!parsed.success) {
      return dataErrorOrRedirect(request, 400, "Données invalides.", fallback);
    }

    try {
      const entry = await adjustBoxBalance({
        householdId,
        boxId,
        targetAmount: parsed.data.targetAmount,
        occurredOn: parsed.data.occurredOn,
        reason: parsed.data.reason ?? null,
        authorMemberId: membership.id,
      });

      return dataOrRedirect(request, `/app/epargne?household=${householdId}&box=${boxId}&adjusted=1`, {
        entry: entry ? { ...entry, amount: entry.amount.toString() } : null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ajustement impossible.";
      return dataErrorOrRedirect(request, 400, message, fallback);
    }
  },
);
