-- Configurable field mapping for the per-event Airtable sync
ALTER TABLE "Event" ADD COLUMN "airtableFieldMap" JSONB;
