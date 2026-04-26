import { dataOrRedirect, withOccurrence } from "@/lib/api";
import { completeOccurrence } from "@/lib/scheduling/service";
import { occurrenceActionSchema } from "@/lib/validation";

export const POST = withOccurrence<{ id: string }>(
  async ({ request, params, membership, formData, defaultDestination }) => {
    const parsed = occurrenceActionSchema.safeParse({
      occurrenceId: params.id,
      memberId: String(formData.get("memberId") || membership.id),
      actualMinutes: formData.get("actualMinutes") || undefined,
      notes: formData.get("notes") || undefined,
      wasCompletedAlone: formData.get("wasCompletedAlone") === "on",
    });

    await completeOccurrence({
      occurrenceId: params.id,
      actorMemberId: parsed.success ? parsed.data.memberId : membership.id,
      actualMinutes: parsed.success ? parsed.data.actualMinutes : undefined,
      notes: parsed.success ? parsed.data.notes : undefined,
      wasCompletedAlone: parsed.success ? parsed.data.wasCompletedAlone : false,
    });

    return dataOrRedirect(request, defaultDestination);
  },
);
