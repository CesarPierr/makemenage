import { dataErrorOrRedirect, dataOrRedirect, withHousehold } from "@/lib/api";
import { deleteTransfer } from "@/lib/savings/service";

export const POST = withHousehold<{ id: string; transferId: string }>(
  async ({ request, params }) => {
    const householdId = params.id;
    const transferId = params.transferId;

    const removed = await deleteTransfer({ transferId, householdId });
    if (!removed) {
      return dataErrorOrRedirect(
        request,
        404,
        "Transfert introuvable.",
        `/app/epargne?household=${householdId}&error=missing`,
      );
    }

    return dataOrRedirect(request, `/app/epargne?household=${householdId}&transferDeleted=1`);
  },
);
