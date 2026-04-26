import { dataOrRedirect, withOccurrence } from "@/lib/api";
import { skipOccurrence } from "@/lib/scheduling/service";
import { occurrenceActionSchema } from "@/lib/validation";

export const POST = withOccurrence<{ id: string }>(
  async ({ request, params, membership, formData, defaultDestination }) => {
    const parsed = occurrenceActionSchema.safeParse({
      occurrenceId: params.id,
      memberId: String(formData.get("memberId") || membership.id),
      notes: formData.get("notes") || undefined,
    });

    await skipOccurrence({
      occurrenceId: params.id,
      actorMemberId: parsed.success ? parsed.data.memberId : membership.id,
      notes: parsed.success ? parsed.data.notes : undefined,
    });

    return dataOrRedirect(request, defaultDestination);
  },
);
