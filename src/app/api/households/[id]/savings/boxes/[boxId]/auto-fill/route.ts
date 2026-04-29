import { dataErrorOrRedirect, dataOrRedirect, withHousehold } from "@/lib/api";
import { db } from "@/lib/db";
import { savingsAutoFillSchema } from "@/lib/validation";

export const POST = withHousehold<{ id: string; boxId: string }>(
  async ({ request, params, formData }) => {
    const householdId = params.id;
    const boxId = params.boxId;
    const fallback = `/app/epargne?household=${householdId}&box=${boxId}&error=invalid`;

    const box = await db.savingsBox.findFirst({ where: { id: boxId, householdId } });
    if (!box) {
      return dataErrorOrRedirect(request, 404, "Enveloppe introuvable.", fallback);
    }

    const action = formData.get("_action")?.toString() ?? "update";

    if (action === "remove") {
      await db.savingsAutoFillRule.deleteMany({ where: { boxId } });
      return dataOrRedirect(request, `/app/epargne?household=${householdId}&box=${boxId}&autoFillRemoved=1`);
    }

    if (action === "pause" || action === "resume") {
      await db.savingsAutoFillRule.updateMany({
        where: { boxId },
        data: { isPaused: action === "pause" },
      });
      return dataOrRedirect(request, `/app/epargne?household=${householdId}&box=${boxId}&autoFillPaused=${action === "pause" ? 1 : 0}`);
    }

    const startsOnRaw = formData.get("startsOn");
    const parsed = savingsAutoFillSchema.safeParse({
      amount: formData.get("amount"),
      type: formData.get("type"),
      interval: formData.get("interval") || undefined,
      dayOfMonth: formData.get("dayOfMonth") || undefined,
      weekdays: formData.getAll("weekdays").map(Number),
      startsOn: startsOnRaw,
      anchorDate: startsOnRaw,
      endsOn: formData.get("endsOn") || undefined,
    });

    if (!parsed.success) {
      console.error("AutoFill Validation Error:", parsed.error.format());
      return dataErrorOrRedirect(request, 400, "Données invalides.", fallback);
    }

    const rule = await db.savingsAutoFillRule.upsert({
      where: { boxId },
      create: {
        boxId,
        amount: parsed.data.amount,
        type: parsed.data.type,
        interval: parsed.data.interval ?? 1,
        dayOfMonth: parsed.data.dayOfMonth,
        weekdays: parsed.data.weekdays,
        startsOn: parsed.data.startsOn,
        endsOn: parsed.data.endsOn,
        anchorDate: parsed.data.startsOn,
      },
      update: {
        amount: parsed.data.amount,
        type: parsed.data.type,
        interval: parsed.data.interval ?? 1,
        dayOfMonth: parsed.data.dayOfMonth,
        weekdays: parsed.data.weekdays,
        startsOn: parsed.data.startsOn,
        endsOn: parsed.data.endsOn,
        anchorDate: parsed.data.startsOn,
      },
    });

    return dataOrRedirect(request, `/app/epargne?household=${householdId}&box=${boxId}&autoFillSaved=1`, {
      rule: { ...rule, amount: rule.amount.toString() },
    });
  },
);
