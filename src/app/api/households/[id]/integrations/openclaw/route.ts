import { withHousehold } from "@/lib/api";
import { upsertOpenClawIntegrationSettings } from "@/lib/integrations/openclaw";
import { redirectTo } from "@/lib/request";

export const POST = withHousehold<{ id: string }>(
  async ({ request, params, formData }) => {
    try {
      const result = await upsertOpenClawIntegrationSettings({
        householdId: params.id,
        isEnabled: formData.get("isEnabled") === "on",
        serverUrl: String(formData.get("serverUrl") ?? ""),
        clientLabel: String(formData.get("clientLabel") ?? ""),
        regenerateKey: formData.get("regenerateKey") === "on",
      });

      const searchParams = new URLSearchParams({
        household: params.id,
        integration: result.apiKey
          ? "key_created"
          : result.integration.isEnabled
            ? "saved"
            : "disabled",
      });

      if (result.apiKey) {
        searchParams.set("generatedKey", result.apiKey);
      }

      return redirectTo(request, `/app/settings/integrations?${searchParams.toString()}`);
    } catch {
      return redirectTo(
        request,
        `/app/settings/integrations?household=${params.id}&integration=invalid`,
      );
    }
  },
  { requireManage: true },
);
