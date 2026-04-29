import { dataErrorOrRedirect, dataOrRedirect, withHousehold } from "@/lib/api";
import { db } from "@/lib/db";
import { savingsAutoFillSchema } from "@/lib/validation";

export const POST = withHousehold<{ id: string; boxId: string }>(
  async ({ request, params, formData }) => {
    const householdId = params.id;
    const boxId = params.boxId;
    const fallback = `/app/epargne/${boxId}?household=${householdId}&error=invalid`;

    const box = await db.savingsBox.findFirst({ where: { id: boxId, householdId } });
    if (!box) {
      return dataErrorOrRedirect(request, 404, "Enveloppe introuvable.", fallback);
    }

    const action = formData.get("_action")?.toString() ?? "upsert";

    if (action === "delete") {
      await db.savingsAutoFillRule.deleteMany({ where: { boxId } });
      return dataOrRedirect(request, `/app/epargne/${boxId}?household=${householdId}&autoFillRemoved=1`);
    }

    if (action === "pause" || action === "resume") {
      await db.savingsAutoFillRule.updateMany({
        where: { boxId },
        data: { isPaused: action === "pause" },
      });
      return dataOrRedirect(request, `/app/epargne/${boxId}?household=${householdId}&autoFillPaused=${action === "pause" ? 1 : 0}`);
    }

    const weekdaysRaw = formData.getAll("weekdays").map((v) => Number.parseInt(v.toString(), 10)).filter(Number.isFinite);

    const parsed = savingsAutoFillSchema.safeParse({
      amount: formData.get("amount"),
      type: formData.get("type"),
      interval: formData.get("interval") || 1,
      weekdays: weekdaysRaw.length ? weekdaysRaw : undefined,
      dayOfMonth: formData.get("dayOfMonth") || undefined,
      anchorDate: formData.get("anchorDate"),
      startsOn: formData.get("startsOn"),
      endsOn: formData.get("endsOn") || undefined,
      isPaused: formData.get("isPaused") === "on" || formData.get("isPaused") === "true",
    });

    if (!parsed.success) {
      return dataErrorOrRedirect(request, 400, "Données invalides.", fallback);
    }

    const data = {
      amount: parsed.data.amount.toFixed(2),
      type: parsed.data.type,
      interval: parsed.data.interval,
      weekdays: parsed.data.weekdays ?? undefined,
      dayOfMonth: parsed.data.dayOfMonth ?? null,
      anchorDate: parsed.data.anchorDate,
      startsOn: parsed.data.startsOn,
      endsOn: parsed.data.endsOn ?? null,
      isPaused: parsed.data.isPaused,
    };

    const rule = await db.savingsAutoFillRule.upsert({
      where: { boxId },
      create: { boxId, ...data },
      update: data,
    });

    return dataOrRedirect(request, `/app/epargne/${boxId}?household=${householdId}&autoFillSaved=1`, {
      rule: { ...rule, amount: rule.amount.toString() },
    });
  },
);
