-- The event's own slug now doubles as its Attend event slug, so the separate
-- attendSlug column is unnecessary.

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "attendSlug";
