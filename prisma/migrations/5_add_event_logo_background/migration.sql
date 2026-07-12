-- Per-event branding: CDN links for the event logo and background, replacing
-- the hardcoded /brand assets. Null falls back to the platform defaults.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "backgroundUrl" TEXT;
