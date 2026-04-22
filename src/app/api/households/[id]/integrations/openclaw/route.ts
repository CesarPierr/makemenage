import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageHousehold } from "@/lib/households";
import { upsertOpenClawIntegrationSettings } from "@/lib/integrations/openclaw";
import { redirectTo } from "@/lib/request";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  const membership = await db.householdMember.findFirst({
    where: {
      householdId: id,
      userId: user.id,
    },
  });

  if (!membership || !canManageHousehold(membership.role)) {
    return redirectTo(request, `/app/settings?household=${id}&panel=integrations&integration=forbidden`);
  }

  const formData = await request.formData();

  try {
    const result = await upsertOpenClawIntegrationSettings({
      householdId: id,
      isEnabled: formData.get("isEnabled") === "on",
      serverUrl: String(formData.get("serverUrl") ?? ""),
      clientLabel: String(formData.get("clientLabel") ?? ""),
      regenerateKey: formData.get("regenerateKey") === "on",
    });

    const searchParams = new URLSearchParams({
      household: id,
      panel: "integrations",
      integration: result.apiKey ? "key_created" : result.integration.isEnabled ? "saved" : "disabled",
    });

    if (result.apiKey) {
      searchParams.set("generatedKey", result.apiKey);
    }

    return redirectTo(request, `/app/settings?${searchParams.toString()}`);
  } catch {
    return redirectTo(request, `/app/settings?household=${id}&panel=integrations&integration=invalid`);
  }
}
