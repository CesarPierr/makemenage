import { dataErrorOrRedirect, dataOrRedirect, withHousehold } from "@/lib/api";
import { db } from "@/lib/db";

export const POST = withHousehold<{ id: string; transferId: string }>(
  async ({ request, params, formData }) => {
    const householdId = params.id;
    const transferId = params.transferId;
    const fallback = `/app/epargne?household=${householdId}&error=invalid`;

    const action = formData.get("_action")?.toString() ?? "delete";

    if (action !== "delete") {
      return dataErrorOrRedirect(request, 400, "Action invalide.", fallback);
    }

    const transfer = await db.savingsTransfer.findFirst({
      where: { id: transferId, householdId },
    });

    if (!transfer) {
      return dataErrorOrRedirect(request, 404, "Transfert introuvable.", fallback);
    }

    // Delete the transfer and associated entries will be handled if needed, 
    // but schema has onDelete: SetNull for entries, so we should delete them manually 
    // or rely on the fact that we WANT to delete them.
    // Actually, schema says: transfer SavingsTransfer? @relation(fields: [transferId], references: [id], onDelete: SetNull)
    // So deleting transfer leaves entries. We must delete entries too.
    
    await db.$transaction([
      db.savingsEntry.deleteMany({ where: { transferId } }),
      db.savingsTransfer.delete({ where: { id: transferId } }),
    ]);

    const searchParams = new URL(request.url).searchParams;
    const boxId = searchParams.get("boxId");
    const tab = searchParams.get("tab");

    let redirectUrl = `/app/epargne?household=${householdId}&transferCancelled=1`;
    if (boxId) redirectUrl += `&box=${boxId}`;
    if (tab) redirectUrl += `&tab=${tab}`;

    return dataOrRedirect(request, redirectUrl, {}, false);
  },
);
