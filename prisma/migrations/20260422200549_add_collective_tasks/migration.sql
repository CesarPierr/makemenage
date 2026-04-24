-- AlterTable
ALTER TABLE "TaskOccurrence" ADD COLUMN     "wasCompletedAlone" BOOLEAN;

-- AlterTable
ALTER TABLE "TaskTemplate" ADD COLUMN     "isCollective" BOOLEAN NOT NULL DEFAULT false;
