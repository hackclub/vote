-- Project cards flatten the event logo to solid white (brightness-0 invert) so
-- it stays legible over the mesh backdrop. Events whose logo depends on its
-- colours can opt out; defaults to true so existing events are unchanged.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "cardLogoMonochrome" BOOLEAN NOT NULL DEFAULT true;
