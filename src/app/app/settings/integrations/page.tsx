import { CopyValueButton } from "@/components/copy-value-button";
import { IntegrationSettingsPanel } from "@/components/integration-settings-panel";
import { requireUser } from "@/lib/auth";
import { canManageHousehold, requireHouseholdContext } from "@/lib/households";
import { getOpenClawIntegrationSettings } from "@/lib/integrations/openclaw";
import { redirect } from "next/navigation";

type IntegrationsPageProps = {
  searchParams: Promise<{ household?: string; integration?: string; generatedKey?: string }>;
};

export default async function IntegrationsSettingsPage({ searchParams }: IntegrationsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const context = await requireHouseholdContext(user.id, params.household);
  const manageable = canManageHousehold(context.membership.role);

  if (!manageable) redirect(`/app/settings?household=${context.household.id}`);

  const openClawSettings = await getOpenClawIntegrationSettings(context.household.id);
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  const feedbackMessage =
    params.integration === "saved"
      ? { tone: "success" as const, text: "Réglages OpenClaw enregistrés." }
      : params.integration === "disabled"
        ? { tone: "success" as const, text: "Intégration OpenClaw désactivée." }
        : params.integration === "invalid"
          ? { tone: "error" as const, text: "Impossible d'enregistrer cette intégration." }
          : params.integration === "forbidden"
            ? { tone: "error" as const, text: "Accès refusé pour cette intégration." }
            : params.integration === "key_created"
              ? { tone: "success" as const, text: "Nouvelle clé d'accès générée." }
              : null;

  return (
    <section className="app-surface rounded-[2rem] p-5 sm:p-6 space-y-5">
      <div>
        <p className="section-kicker">Intégrations</p>
        <h3 className="display-title mt-2 text-3xl">OpenClaw & MCP</h3>
      </div>

      {feedbackMessage ? (
        <div
          className="rounded-[1.4rem] border px-4 py-3 text-sm leading-6"
          style={{
            backgroundColor: feedbackMessage.tone === "success" ? "rgba(56,115,93,0.12)" : "rgba(216,100,61,0.12)",
            borderColor: "rgba(30,31,34,0.06)",
            color: feedbackMessage.tone === "success" ? "var(--leaf-600)" : "var(--coral-600)",
          }}
        >
          {feedbackMessage.text}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <IntegrationSettingsPanel
          canManage={manageable}
          householdId={context.household.id}
          initialSettings={openClawSettings ?? {
            householdId: context.household.id,
            provider: "mcp_openclaw",
            isEnabled: false,
            serverUrl: null,
            clientLabel: null,
            apiKeyPreview: null,
            hasApiKey: false,
            updatedAt: null,
          }}
        />

        <div className="space-y-4">
          <article className="soft-panel p-5">
            <p className="section-kicker">État</p>
            <h4 className="display-title mt-2 text-2xl">
              {openClawSettings?.isEnabled ? "Connexion prête" : "Connexion inactive"}
            </h4>
            <div className="mt-4 space-y-2 text-sm text-[var(--ink-700)]">
              <p>Clé actuelle: {openClawSettings?.apiKeyPreview ?? "aucune"}</p>
              <p className="font-mono text-[0.72rem] break-all">
                {`${appBaseUrl}/api/integrations/mcp/openclaw/discovery?householdId=${context.household.id}`}
              </p>
            </div>
          </article>

          <article className="soft-panel space-y-3 p-5">
            <p className="text-sm font-semibold text-[var(--ink-950)]">Connexions rapides</p>
            <CopyValueButton
              label="Copier la discovery URL"
              value={`${appBaseUrl}/api/integrations/mcp/openclaw/discovery?householdId=${context.household.id}`}
            />
            <CopyValueButton label="Copier l'id du foyer" value={context.household.id} />
            {params.generatedKey ? (
              <CopyValueButton label="Copier la clé générée" value={params.generatedKey} />
            ) : null}
          </article>

          <article className="soft-panel space-y-3 p-5">
            <p className="text-sm font-semibold text-[var(--ink-950)]">Serveur MCP local</p>
            <CopyValueButton
              label="Copier la commande MCP"
              value={`MAKEMENAGE_MCP_HOUSEHOLD_ID=${context.household.id} npm run mcp:server`}
            />
          </article>
        </div>
      </div>
    </section>
  );
}
