import { dataErrorOrRedirect, dataOrRedirect, withOccurrence } from "@/lib/api";
import { reassignOccurrence } from "@/lib/scheduling/service";

export const POST = withOccurrence<{ id: string }>(
  async ({ request, params, membership, formData, defaultDestination }) => {
    const assignedMemberId = formData.get("assignedMemberId")?.toString();

    if (!assignedMemberId) {
      return dataErrorOrRedirect(request, 400, "Membre manquant.", defaultDestination);
    }

    await reassignOccurrence({
      occurrenceId: params.id,
      actorMemberId: String(formData.get("memberId") || membership.id),
      assignedMemberId,
    });

    return dataOrRedirect(request, defaultDestination);
  },
);
