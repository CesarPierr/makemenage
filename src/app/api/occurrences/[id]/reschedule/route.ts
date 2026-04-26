import { dataErrorOrRedirect, dataOrRedirect, withOccurrence } from "@/lib/api";
import { parseDateInput } from "@/lib/date-input";
import { rescheduleOccurrence } from "@/lib/scheduling/service";

export const POST = withOccurrence<{ id: string }>(
  async ({ request, params, membership, formData, defaultDestination }) => {
    const date = formData.get("date")?.toString();

    if (!date) {
      return dataErrorOrRedirect(request, 400, "Date manquante.", defaultDestination);
    }

    await rescheduleOccurrence({
      occurrenceId: params.id,
      actorMemberId: String(formData.get("memberId") || membership.id),
      scheduledDate: parseDateInput(date),
    });

    return dataOrRedirect(request, defaultDestination);
  },
);
