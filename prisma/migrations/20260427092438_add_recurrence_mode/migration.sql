-- CreateEnum
CREATE TYPE "RecurrenceMode" AS ENUM ('FIXED', 'SLIDING');

-- AlterTable
ALTER TABLE "RecurrenceRule" ADD COLUMN     "mode" "RecurrenceMode" NOT NULL DEFAULT 'SLIDING';

-- AlterTable
ALTER TABLE "TaskTemplate" ADD COLUMN     "lastCompletedAt" TIMESTAMP(3);
