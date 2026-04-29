import { dataOrRedirect, withHousehold } from "@/lib/api";
import { runAutoFillCatchup } from "@/lib/savings/service";

export const POST = withHousehold<{ id: string }>(
  async ({ request, params }) => {
    const result = await runAutoFillCatchup({ householdId: params.id });
    return dataOrRedirect(request, `/app/epargne?household=${params.id}&filled=${result.createdEntries}`, result);
  },
);
