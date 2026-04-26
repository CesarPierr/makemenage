-- AlterTable
ALTER TABLE "TaskTemplate" ADD COLUMN     "icon" TEXT;

-- CreateTable
CREATE TABLE "OccurrenceComment" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OccurrenceComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OccurrenceComment_occurrenceId_createdAt_idx" ON "OccurrenceComment"("occurrenceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_memberId_idx" ON "PushSubscription"("memberId");

-- CreateIndex
CREATE INDEX "TaskOccurrence_householdId_status_scheduledDate_idx" ON "TaskOccurrence"("householdId", "status", "scheduledDate");

-- CreateIndex
CREATE INDEX "TaskOccurrence_householdId_assignedMemberId_scheduledDate_idx" ON "TaskOccurrence"("householdId", "assignedMemberId", "scheduledDate");

-- AddForeignKey
ALTER TABLE "OccurrenceComment" ADD CONSTRAINT "OccurrenceComment_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "TaskOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccurrenceComment" ADD CONSTRAINT "OccurrenceComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
