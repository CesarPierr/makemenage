-- AlterTable
ALTER TABLE "TaskOccurrence" ADD COLUMN "rescheduleCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "HouseholdHoliday" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HouseholdHoliday_householdId_startDate_idx" ON "HouseholdHoliday"("householdId", "startDate");

-- AddForeignKey
ALTER TABLE "HouseholdHoliday" ADD CONSTRAINT "HouseholdHoliday_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
