-- Per-event Airtable OAuth connection (replaces the single-tenant AIRTABLE_API_KEY)
ALTER TABLE "Event"
  ADD COLUMN "airtableBaseName" TEXT,
  ADD COLUMN "airtableTableName" TEXT,
  ADD COLUMN "airtableAccessToken" TEXT,
  ADD COLUMN "airtableRefreshToken" TEXT,
  ADD COLUMN "airtableTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "airtableConnectedBy" TEXT;
