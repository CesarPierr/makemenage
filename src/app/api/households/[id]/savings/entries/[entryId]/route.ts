import { dataErrorOrRedirect, dataOrRedirect, withHousehold } from "@/lib/api";
import { db } from "@/lib/db";
import { savingsEntryUpdateSchema } from "@/lib/validation";

export const POST = withHousehold<{ id: string; entryId: string }>(
  async ({ request, params, formData }) => {
    const householdId = params.id;
    const entryId = params.entryId;
    const fallback = `/app/epargne?household=${householdId}&error=invalid`;

    const entry = await db.savingsEntry.findFirst({
      where: { id: entryId, householdId },
    });
    if (!entry) {
      return dataErrorOrRedirect(request, 404, "Mouvement introuvable.", fallback);
    }

    if (entry.transferId) {
      return dataErrorOrRedirect(
        request,
        400,
        "Ce mouvement fait partie d'un transfert. Annulez le transfert à la place.",
        fallback,
      );
    }
    if (entry.type === "auto_fill") {
      return dataErrorOrRedirect(
        request,
        400,
        "Mouvement automatique : modifiez la règle d'auto-versement à la place.",
        fallback,
      );
    }

    const tab = new URL(request.url).searchParams.get("tab");
    const tabParam = tab ? `&tab=${tab}` : "";

    const action = formData.get("_action")?.toString() ?? "update";

    if (action === "delete") {
      await db.savingsEntry.delete({ where: { id: entryId } });
      return dataOrRedirect(request, `/app/epargne?household=${householdId}&box=${entry.boxId}&deleted=1${tabParam}`);
    }

    const parsed = savingsEntryUpdateSchema.safeParse({
      amount: formData.get("amount") || undefined,
      occurredOn: formData.get("occurredOn") || undefined,
      reason: formData.get("reason") || undefined,
    });

    if (!parsed.success) {
      return dataErrorOrRedirect(request, 400, "Données invalides.", fallback);
    }

    const updated = await db.savingsEntry.update({
      where: { id: entryId },
      data: {
        amount: parsed.data.amount !== undefined ? parsed.data.amount.toFixed(2) : undefined,
        occurredOn: parsed.data.occurredOn ?? undefined,
        reason: parsed.data.reason ?? undefined,
      },
    });

    return dataOrRedirect(request, `/app/epargne?household=${householdId}&box=${entry.boxId}&updated=1${tabParam}`, {
      entry: { ...updated, amount: updated.amount.toString() },
    });
  },
);
