import { dataOrRedirect, withOccurrence } from "@/lib/api";
import { reopenOccurrence } from "@/lib/scheduling/service";

export const POST = withOccurrence<{ id: string }>(
  async ({ request, params, membership, formData, defaultDestination }) => {
    await reopenOccurrence({
      occurrenceId: params.id,
      actorMemberId: String(formData.get("memberId") || membership.id),
      notes: formData.get("notes")?.toString() || undefined,
    });

    return dataOrRedirect(request, defaultDestination);
  },
);
