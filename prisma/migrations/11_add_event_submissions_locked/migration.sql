-- Lets admins freeze submissions in the middle of the SUBMISSION stage without
-- moving the whole event to VOTING. Teams can't start or edit projects while
-- locked, but anything already submitted stays visible. Defaults to false so
-- existing events keep accepting submissions.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "submissionsLocked" BOOLEAN NOT NULL DEFAULT false;
