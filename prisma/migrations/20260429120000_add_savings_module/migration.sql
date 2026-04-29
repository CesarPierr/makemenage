-- CreateEnum
CREATE TYPE "SavingsBoxKind" AS ENUM ('savings', 'project', 'debt', 'provision');

-- CreateEnum
CREATE TYPE "SavingsEntryType" AS ENUM ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'auto_fill', 'adjustment');

-- CreateTable
CREATE TABLE "SavingsBox" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SavingsBoxKind" NOT NULL DEFAULT 'savings',
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#D8643D',
    "targetAmount" DECIMAL(12,2),
    "targetDate" TIMESTAMP(3),
    "allowNegative" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsAutoFillRule" (
    "id" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "RecurrenceType" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "weekdays" JSONB,
    "dayOfMonth" INTEGER,
    "anchorDate" TIMESTAMP(3) NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3),
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "lastAppliedOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsAutoFillRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsEntry" (
    "id" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "type" "SavingsEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "authorMemberId" TEXT,
    "transferId" TEXT,
    "autoFillRuleId" TEXT,
    "autoFillKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsTransfer" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "fromBoxId" TEXT NOT NULL,
    "toBoxId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "authorMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavingsBox_householdId_isArchived_sortOrder_idx" ON "SavingsBox"("householdId", "isArchived", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsAutoFillRule_boxId_key" ON "SavingsAutoFillRule"("boxId");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsEntry_autoFillRuleId_autoFillKey_key" ON "SavingsEntry"("autoFillRuleId", "autoFillKey");

-- CreateIndex
CREATE INDEX "SavingsEntry_boxId_occurredOn_idx" ON "SavingsEntry"("boxId", "occurredOn");

-- CreateIndex
CREATE INDEX "SavingsEntry_householdId_occurredOn_idx" ON "SavingsEntry"("householdId", "occurredOn");

-- CreateIndex
CREATE INDEX "SavingsEntry_transferId_idx" ON "SavingsEntry"("transferId");

-- CreateIndex
CREATE INDEX "SavingsTransfer_householdId_occurredOn_idx" ON "SavingsTransfer"("householdId", "occurredOn");

-- CreateIndex
CREATE INDEX "SavingsTransfer_fromBoxId_idx" ON "SavingsTransfer"("fromBoxId");

-- CreateIndex
CREATE INDEX "SavingsTransfer_toBoxId_idx" ON "SavingsTransfer"("toBoxId");

-- AddForeignKey
ALTER TABLE "SavingsBox" ADD CONSTRAINT "SavingsBox_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsAutoFillRule" ADD CONSTRAINT "SavingsAutoFillRule_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "SavingsBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsEntry" ADD CONSTRAINT "SavingsEntry_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "SavingsBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsEntry" ADD CONSTRAINT "SavingsEntry_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "SavingsTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsTransfer" ADD CONSTRAINT "SavingsTransfer_fromBoxId_fkey" FOREIGN KEY ("fromBoxId") REFERENCES "SavingsBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsTransfer" ADD CONSTRAINT "SavingsTransfer_toBoxId_fkey" FOREIGN KEY ("toBoxId") REFERENCES "SavingsBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
