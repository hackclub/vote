-- Reconciles the schema with `prisma/schema.prisma`. The `EventAdmin` table and
-- the removal of `User.isAdmin` were previously applied to databases via
-- `db push` without being recorded as migrations, so `0_init` alone produces a
-- stale schema on a fresh database. This migration brings `0_init` up to date
-- and adds `Event.attendSlug` (participation is sourced from the Attend API).

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "attendSlug" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isAdmin";

-- CreateTable
CREATE TABLE "EventAdmin" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "addedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventAdmin_eventId_email_key" ON "EventAdmin"("eventId", "email");

-- AddForeignKey
ALTER TABLE "EventAdmin" ADD CONSTRAINT "EventAdmin_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
