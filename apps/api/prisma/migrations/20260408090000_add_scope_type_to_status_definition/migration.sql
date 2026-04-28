-- Add scopeType to StatusDefinition
-- Values: "Client" | "System"
-- Backfill: clientId IS NOT NULL → "Client", else → "System"

ALTER TABLE "StatusDefinition" ADD COLUMN "ScopeType" VARCHAR(20);

UPDATE "StatusDefinition"
SET "ScopeType" = CASE WHEN "ClientId" IS NOT NULL THEN 'Client' ELSE 'System' END
WHERE "ScopeType" IS NULL;
