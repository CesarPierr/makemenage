CREATE TYPE "IntegrationProvider" AS ENUM ('mcp_openclaw');

CREATE TABLE "HouseholdIntegration" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "serverUrl" TEXT,
    "clientLabel" TEXT,
    "apiKeyHash" TEXT,
    "apiKeyPreview" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HouseholdIntegration_householdId_provider_key"
ON "HouseholdIntegration"("householdId", "provider");

CREATE INDEX "HouseholdIntegration_provider_isEnabled_idx"
ON "HouseholdIntegration"("provider", "isEnabled");

ALTER TABLE "HouseholdIntegration"
ADD CONSTRAINT "HouseholdIntegration_householdId_fkey"
FOREIGN KEY ("householdId") REFERENCES "Household"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
