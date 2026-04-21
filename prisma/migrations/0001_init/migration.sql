-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('weekly_rule', 'date_range_absence');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('daily', 'every_x_days', 'weekly', 'every_x_weeks', 'monthly_simple');

-- CreateEnum
CREATE TYPE "AssignmentMode" AS ENUM ('fixed', 'manual', 'strict_alternation', 'round_robin', 'least_assigned_count', 'least_assigned_minutes');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('planned', 'due', 'overdue', 'completed', 'skipped', 'rescheduled', 'cancelled');

-- CreateEnum
CREATE TYPE "OccurrenceActionType" AS ENUM ('created', 'assigned', 'completed', 'skipped', 'rescheduled', 'reassigned', 'edited', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "role" "HouseholdRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "weightingFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "weeklyCapacityMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberAvailability" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "AvailabilityType" NOT NULL,
    "weekdays" JSONB,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurrenceRule" (
    "id" TEXT NOT NULL,
    "type" "RecurrenceType" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "weekdays" JSONB,
    "dayOfMonth" INTEGER,
    "anchorDate" TIMESTAMP(3) NOT NULL,
    "generateTimeOfDay" TEXT,
    "dueOffsetDays" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurrenceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentRule" (
    "id" TEXT NOT NULL,
    "mode" "AssignmentMode" NOT NULL,
    "eligibleMemberIds" JSONB NOT NULL,
    "fixedMemberId" TEXT,
    "rotationOrder" JSONB,
    "fairnessWindowDays" INTEGER,
    "preserveRotationOnSkip" BOOLEAN NOT NULL DEFAULT true,
    "preserveRotationOnReschedule" BOOLEAN NOT NULL DEFAULT true,
    "rebalanceOnMemberAbsence" BOOLEAN NOT NULL DEFAULT true,
    "lockAssigneeAfterGeneration" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "room" TEXT,
    "tags" JSONB,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
    "difficulty" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3),
    "recurrenceRuleId" TEXT NOT NULL,
    "assignmentRuleId" TEXT NOT NULL,
    "createdByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskOccurrence" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "taskTemplateId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "assignedMemberId" TEXT,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'planned',
    "sourceGenerationKey" TEXT NOT NULL,
    "generationVersion" INTEGER NOT NULL DEFAULT 1,
    "originalScheduledDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedByMemberId" TEXT,
    "actualMinutes" INTEGER,
    "notes" TEXT,
    "isManuallyModified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccurrenceActionLog" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "actionType" "OccurrenceActionType" NOT NULL,
    "actorMemberId" TEXT,
    "previousValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OccurrenceActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Household_createdByUserId_idx" ON "Household"("createdByUserId");

-- CreateIndex
CREATE INDEX "HouseholdMember_householdId_idx" ON "HouseholdMember"("householdId");

-- CreateIndex
CREATE INDEX "HouseholdMember_userId_idx" ON "HouseholdMember"("userId");

-- CreateIndex
CREATE INDEX "MemberAvailability_memberId_startDate_endDate_idx" ON "MemberAvailability"("memberId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "TaskTemplate_recurrenceRuleId_key" ON "TaskTemplate"("recurrenceRuleId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskTemplate_assignmentRuleId_key" ON "TaskTemplate"("assignmentRuleId");

-- CreateIndex
CREATE INDEX "TaskTemplate_householdId_idx" ON "TaskTemplate"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskOccurrence_sourceGenerationKey_key" ON "TaskOccurrence"("sourceGenerationKey");

-- CreateIndex
CREATE INDEX "TaskOccurrence_householdId_scheduledDate_idx" ON "TaskOccurrence"("householdId", "scheduledDate");

-- CreateIndex
CREATE INDEX "TaskOccurrence_assignedMemberId_scheduledDate_idx" ON "TaskOccurrence"("assignedMemberId", "scheduledDate");

-- CreateIndex
CREATE INDEX "TaskOccurrence_taskTemplateId_idx" ON "TaskOccurrence"("taskTemplateId");

-- CreateIndex
CREATE INDEX "OccurrenceActionLog_occurrenceId_idx" ON "OccurrenceActionLog"("occurrenceId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberAvailability" ADD CONSTRAINT "MemberAvailability_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_recurrenceRuleId_fkey" FOREIGN KEY ("recurrenceRuleId") REFERENCES "RecurrenceRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_assignmentRuleId_fkey" FOREIGN KEY ("assignmentRuleId") REFERENCES "AssignmentRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_createdByMemberId_fkey" FOREIGN KEY ("createdByMemberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOccurrence" ADD CONSTRAINT "TaskOccurrence_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOccurrence" ADD CONSTRAINT "TaskOccurrence_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "TaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOccurrence" ADD CONSTRAINT "TaskOccurrence_assignedMemberId_fkey" FOREIGN KEY ("assignedMemberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOccurrence" ADD CONSTRAINT "TaskOccurrence_completedByMemberId_fkey" FOREIGN KEY ("completedByMemberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccurrenceActionLog" ADD CONSTRAINT "OccurrenceActionLog_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "TaskOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccurrenceActionLog" ADD CONSTRAINT "OccurrenceActionLog_actorMemberId_fkey" FOREIGN KEY ("actorMemberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

