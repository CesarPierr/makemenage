export type OpenClawIntegrationSettingsSnapshot = {
  householdId: string;
  provider: "mcp_openclaw";
  isEnabled: boolean;
  serverUrl: string | null;
  clientLabel: string | null;
  apiKeyPreview: string | null;
  hasApiKey: boolean;
  updatedAt: string | null;
};
